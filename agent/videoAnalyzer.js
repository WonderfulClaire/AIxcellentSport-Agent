// app/agent/videoAnalyzer.js
// 视频动作分析引擎：上传视频 → MediaPipe逐帧提取 → 关节角时序分析 → LLM生成专业报告

import { callLLM } from "./coachAgent.js";

/**
 * 从视频中逐帧提取姿态数据（MediaPipe IMAGE 模式）
 * @param {HTMLVideoElement} video - 已加载的视频元素
 * @param {import('@mediapipe/tasks-vision').PoseLandmarker} landmarker
 * @param {HTMLCanvasElement} canvas - 用于绘制的画布（可选，用于关键帧截图）
 * @param {{onProgress?: (pct:number)=>void, maxFrames?: number, sampleInterval?: number}} opts
 * @returns {Promise<FrameResult[]>}
 */
export async function extractFramePoses(video, landmarker, canvas, opts = {}) {
  const { onProgress, maxFrames = 150, sampleInterval = 5 } = opts;
  const frames = [];
  const duration = video.duration;
  // 每 sampleInterval 帧采样一次，控制总量
  const fps = 30; // 假设30fps
  const totalFramesToSample = Math.min(maxFrames, Math.floor(duration * fps / sampleInterval));
  const ctx = canvas?.getContext("2d");

  for (let i = 0; i < totalFramesToSample; i++) {
    const time = (i / totalFramesToSample) * duration;
    video.currentTime = time;
    // 等待 seek 完成
    await new Promise((resolve) => {
      video.onseeked = resolve;
      setTimeout(resolve, 200); // 超时兜底
    });

    try {
      const result = landmarker.detectForImage(video, performance.now());
      if (result.landmarks?.length > 0) {
        // 取最大人体
        const chosen = result.landmarks.length === 1
          ? result.landmarks[0]
          : result.landmarks.reduce((best, lm) => {
              const xs = lm.map((p) => p.x);
              const ys = lm.map((p) => p.y);
              const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
              return area > best.area ? { lm, area } : best;
            }, { lm: result.landmarks[0], area: -1 }).lm;

        // 计算关节角度
        const joints = computeJointAngles(chosen);

        // 截取关键帧图片（每10帧截一张）
        let keyframeDataUrl = null;
        if (canvas && ctx && i % 10 === 0) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0);
          // 画骨架
          drawSkeleton(ctx, chosen);
          keyframeDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        }

        frames.push({
          index: i,
          time: Math.round(time * 1000),
          landmarks: chosen,
          joints,
          confidence: result.worldLandmarks ? 1 : 0.8,
          keyframe: keyframeDataUrl,
        });
      }
    } catch (e) {
      // 单帧失败跳过
      console.warn(`Frame ${i} detection failed:`, e);
    }

    if (onProgress) onProgress(Math.round(((i + 1) / totalFramesToSample) * 100));
  }

  return frames;
}

/**
 * 计算33个关键点中的主要关节角度
 */
function computeJointAngles(lm) {
  const angle = (a, b, c) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const cos = (ab.x * cb.x + ab.y * cb.y) / (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1);
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  };

  return {
    // 下肢
    leftKnee: angle(lm[23], lm[25], lm[27]),
    rightKnee: angle(lm[24], lm[26], lm[28]),
    leftHip: angle(lm[11], lm[23], lm[25]),
    rightHip: angle(lm[12], lm[24], lm[26]),
    leftAnkle: angle(lm[25], lm[27], lm[29]) || 180,
    rightAnkle: angle(lm[26], lm[28], lm[30]) || 180,
    // 上肢
    leftElbow: angle(lm[11], lm[13], lm[15]),
    rightElbow: angle(lm[12], lm[14], lm[16]),
    leftShoulder: angle(lm[13], lm[11], lm[23]),
    rightShoulder: angle(lm[14], lm[12], lm[24]),
    // 躯干
    torso: angle(lm[11], lm[23], lm[27]), // 肩-髋-踝直线度
    hipTilt: angle(lm[23], lm[24], lm[26]), // 骨盆倾斜
  };
}

/**
 * 在Canvas上绘制骨架线
 */
function drawSkeleton(ctx, landmarks) {
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 上肢
    [11, 23], [12, 24], [23, 24], // 躯干
    [23, 25], [25, 27], [24, 26], [26, 28], // 下肢
    [27, 29], [28, 30], // 脚踝
    [11, 23], [23, 25], [25, 27], // 左侧链
    [12, 24], [24, 26], [26, 28], // 右侧链
  ];

  ctx.strokeStyle = "#55c8ff";
  ctx.lineWidth = 3;
  for (const [a, b] of connections) {
    if (landmarks[a] && landmarks[b]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * ctx.canvas.width, landmarks[a].y * ctx.canvas.height);
      ctx.lineTo(landmarks[b].x * ctx.canvas.width, landmarks[b].y * ctx.canvas.height);
      ctx.stroke();
    }
  }

  // 画关键点
  ctx.fillStyle = "#fff4b8";
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * ctx.canvas.width, p.y * ctx.canvas.height, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 分析时序数据，提取统计特征和问题模式
 */
export function analyzeTimeSeries(frames) {
  if (frames.length < 5) {
    return { error: "视频帧数不足，请确保视频中人物清晰可见且动作完整" };
  }

  const kneeAngles = frames.map((f) => f.joints.leftKnee);
  const elbowAngles = frames.map((f) => f.joints.leftElbow);
  const torsoAngles = frames.map((f) => f.joints.torso);

  // 统计特征
  const stats = {
    frameCount: frames.length,
    durationMs: frames[frames.length - 1]?.time || 0,
    // 膝盖角范围
    kneeMin: Math.round(Math.min(...kneeAngles)),
    kneeMax: Math.round(Math.max(...kneeAngles)),
    kneeAvg: Math.round(kneeAngles.reduce((a, b) => a + b, 0) / kneeAngles.length),
    kneeRange: Math.round(Math.max(...kneeAngles) - Math.min(...kneeAngles)),
    // 肘部角范围
    elbowMin: Math.round(Math.min(...elbowAngles)),
    elbowMax: Math.round(Math.max(...elbowAngles)),
    elbowAvg: Math.round(elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length),
    // 躯干稳定性
    torsoMin: Math.round(Math.min(...torsoAngles)),
    torsoMax: Math.round(Math.max(...torsoAngles)),
    torsoStability: Math.round(
      torsoAngles.reduce((sum, v) => sum + Math.abs(v - torsoAngles.reduce((a, b) => a + b, 0) / torsoAngles.length), 0) /
        torsoAngles.length
    ),
    // 左右对称性
    leftRightKneeDiff: Math.round(
      frames.reduce((sum, f) => sum + Math.abs(f.joints.leftKnee - f.joints.rightKnee), 0) / frames.length
    ),
    leftRightElbowDiff: Math.round(
      frames.reduce((sum, f) => sum + Math.abs(f.joints.leftElbow - f.joints.rightElbow), 0) / frames.length
    ),
  };

  // 问题检测
  const issues = [];

  // 1. 动作幅度不足
  if (stats.kneeRange < 35) {
    issues.push({ severity: "high", type: "range", label: "下蹲/动作幅度不足", detail: `膝盖角变化仅${stats.kneeRange}°，建议达到50°以上以充分刺激目标肌群` });
  }

  // 2. 左右不对称
  if (stats.leftRightKneeDiff > 10) {
    issues.push({ severity: "medium", type: "asymmetry", label: "左右发力不均", detail: `左右膝盖角平均差${stats.leftRightKneeDiff}°，注意弱侧代偿` });
  }
  if (stats.leftRightElbowDiff > 12) {
    issues.push({ severity: "medium", type: "asymmetry", label: "左右手臂不平衡", detail: `左右肘角平均差${stats.leftRightElbowDiff}°` });
  }

  // 3. 躯干不稳定
  if (stats.torsoStability > 6) {
    issues.push({ severity: "medium", type: "stability", label: "躯干不稳定", detail: `肩-髋-踝角波动达±${stats.torsoStability}°，核心可能松散` });
  }

  // 4. 膝盖内扣风险（通过膝盖间距判断）
  const avgKneeGap = frames.reduce((sum, f) => {
    const lk = f.landmarks[25], rk = f.landmarks[26];
    return sum + Math.abs(lk.x - rk.x);
  }, 0) / frames.length;
  const avgAnkleGap = frames.reduce((sum, f) => {
    const la = f.landmarks[27], ra = f.landmarks[28];
    return sum + Math.abs(la.x - ra.x);
  }, 0) / frames.length;

  if (avgAnkleGap > 0 && avgKneeGap < avgAnkleGap * 0.7) {
    issues.push({ severity: "high", type: "valgus", label: "膝盖内扣趋势", detail: "膝盖间距小于脚踝间距的70%，有膝内扣(valgus)风险" });
  }

  // 5. 推断动作类型
  const exerciseType = inferExercise(stats, issues);

  return { stats, issues, exerciseType, keyframes: frames.filter((f) => f.keyframe).map((f) => ({ time: f.time, image: f.keyframe })) };
}

/**
 * 根据统计特征推断动作类型
 */
function inferExercise(stats, issues) {
  const { kneeRange, elbowRange, kneeMin, elbowMin } = stats;

  if (kneeRange > 40 && kneeMin < 110) return { name: "深蹲/蹲类", confidence: 0.85 };
  if (elbowRange > 60 && elbowMin < 90) return { name: "俯卧撑/推类", confidence: 0.82 };
  if (kneeRange > 30 && kneeMin < 120 && stats.leftRightKneeDiff > 8) return { name: "弓步/单腿", confidence: 0.78 };
  if (kneeRange < 20 && stats.torsoStability < 5) return { name: "平板支撑/静态保持", confidence: 0.75 };
  if (kneeRange > 25 && elbowRange > 20) return { name: "开合跳/全身复合", confidence: 0.7 };

  return { name: "综合训练", confidence: 0.5 };
}

/**
 * 调用 LLM 生成专业分析报告（对标 Gemini 截图的4段式结构）
 * @param {{stats: object, issues: Array, exerciseType: object, keyframes: Array, userNotes?: string}} analysis
 * @param {object} config - LLM 配置
 * @returns {Promise<object>} 结构化报告
 */
export async function generateVideoReport(analysis, config) {
  const { stats, issues, exerciseType, keyframes, userNotes = "" } = analysis;

  // 构建结构化prompt
  const systemPrompt = `你是一位专业的AI运动康复分析师（类似Gemini的视频健身教练功能）。
用户上传了一段健身视频，AI已逐帧提取了人体姿态数据并完成初步分析。
你需要基于这些数据，输出一份专业的中文动作改进报告。

**输出格式要求**：严格返回JSON，包含以下字段：
{
  "exerciseName": "识别出的动作名称",
  "overallScore": 0-100整数,
  "summary": "一句话总体评价",
  "sections": [
    {
      "title": "问题诊断",
      "content": "详细描述当前存在的问题（基于数据分析）"
    },
    {
      "title": "改进方法",
      "content": "针对每个问题的具体改进指导，包括发力要点、意识引导"
    },
    {
      "title": "替代方案",
      "content": "如果当前动作太难或有关节不适，推荐的降阶或替代动作"
    },
    {
      "title": "进阶调整",
      "content": "想要进一步提升可以尝试的变化（负重、节奏、幅度等）"
    }
  ],
  "keyTips": ["简短可执行的提示1", "提示2", "提示3"],
  "riskWarnings": ["安全警告（如有）"]
}

**语气风格**：专业但不晦涩，像一位经验丰富的私教在说话。用中文。
**参考Gemini的分析风格**：分点清晰、有具体角度数值、给出"想象..."这类意象化指导。`;

  const userData = `【用户备注】${userNotes || "无"}

【AI姿态分析数据】
- 识别动作：${exerciseType.name}（置信度${Math.round(exerciseType.confidence * 100)}%）
- 分析帧数：${stats.frameCount}帧，时长${(stats.durationMs / 1000).toFixed(1)}秒
- 膝盖角：最小${stats.kneeMin}° / 最大${stats.kneeMax}° / 平均${stats.kneeAvg}° / 变化幅度${stats.kneeRange}°
- 肘部角：最小${stats.elbowMin}° / 最大${stats.elbowMax}° / 平均${stats.elbowAvg}°
- 躯干稳定度：偏差±${stats.torsoStability}°（越小越稳）
- 左右对称：膝盖差${stats.leftRightKneeDiff}° / 肘差${stats.leftRightElbowDiff}°

【检测到的问题】
${issues.length ? issues.map((i) => `[${i.severity === "high" ? "严重" : "中等"}] ${i.label}: ${i.detail}`).join("\n") : "未发现明显问题，动作整体标准"}`;

  // 尝试调用 LLM
  if (config?.apiKey && config?.baseUrl) {
    const reply = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userData },
      ],
      config,
    );

    if (reply) {
      try {
        return JSON.parse(reply);
      } catch {
        // JSON 解析失败，走启发式
      }
    }
  }

  // 启发式兜底报告
  return generateHeuristicReport(analysis);
}

/**
 * 无 LLM 时的确定性报告
 */
function generateHeuristicReport(analysis) {
  const { stats, issues, exerciseType } = analysis;
  const score = Math.max(60, 100 - issues.filter((i) => i.severity === "high").length * 15 - issues.filter((i) => i.severity === "medium").length * 8);

  const sections = [
    {
      title: "问题诊断",
      content: issues.length
        ? issues.map((i) => `• ${i.label}：${i.detail}`).join("\n")
        : "从姿态数据分析来看，你的动作整体较为标准，未发现明显的代偿或错误模式。",
    },
    {
      title: "改进方法",
      content: issues.length
        ? issues.map((i) => {
            const tips = {
              range: "放慢速度，在每个动作末端停留1-2秒，感受目标肌群的充分收缩。",
              asymmetry: "降低重量或难度，专注于弱侧的感受。可以先做单侧训练来纠正 imbalance。",
              stability: "核心收紧是关键！想象有人要轻轻打你的肚子，你会自然绷紧。",
              valgus: "做动作时有意识地把膝盖朝脚尖方向推开，想象把地面踩得更宽。",
            };
            return `• 针对「${i.label}」：${tips[i.type] || "注意动作质量优先于数量。"}`;
          }).join("\n")
        : "继续保持当前的动作质量。如果想进一步提升，可以尝试：\n• 放慢动作节奏，增加肌肉紧张时间\n• 在动作顶峰收缩目标肌群1-2秒",
    },
    {
      title: "替代方案",
      content: `如果当前${exerciseType.name}感觉困难或有不适：
• 降低幅度：先做半程动作，建立正确的动作模式后再增加幅度
• 减少负荷：自重练习熟练后再考虑负重
• 替换动作：如深蹲可替换为靠墙静蹲、箱式深蹲`,
    },
    {
      title: "进阶调整",
      content: "当你已经能标准完成当前动作后：\n• 增加时间 under tension（向心2秒+离心3秒）\n• 尝试单侧变体（如单腿硬拉、单臂俯卧撑）\n• 加入暂停 reps（在动作最难的位置停2秒）",
    },
  ];

  return {
    exerciseName: exerciseType.name,
    overallScore: score,
    summary: score >= 85 ? "动作质量优秀，继续保持！" : score >= 70 ? "整体不错，有一些细节可以优化。" : "建议重点关注改进方法中的建议，提升动作安全性。",
    sections,
    keyTips: [
      "质量永远优先于次数",
      issues.some((i) => i.type === "stability") ? "收紧核心，保护腰椎" : "注意呼吸节奏，发力时呼气",
      "如有疼痛立即停止，咨询专业人士",
    ],
    riskWarnings: issues.filter((i) => i.severity === "high").map((i) => `${i.label}：${i.detail}`),
  };
}
