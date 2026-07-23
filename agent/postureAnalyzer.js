// app/agent/postureAnalyzer.js
// AI 体态评估引擎：照片上传 → MediaPipe 33关键点 → 体态指标计算 → LLM 综合报告
// 对标 Gemini 截图能力：头前倾/圆肩/骨盆倾斜/脊柱侧弯/高低肩/膝超伸

import { callLLM } from "./coachAgent.js";

// ─── MediaPipe 关键点索引 ──────────────────────────────
const MP = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

/**
 * 从单张图片的 landmarks 计算全部体态指标
 * @param {Array<{x:number,y:number,z:number}>} lm - MediaPipe 33个关键点 (归一化 0-1)
 * @param {"front"|"back"|"side"} viewAngle - 拍摄视角
 * @returns {PostureMetrics}
 */
export function computePostureMetrics(lm, viewAngle = "front") {
  // 辅助函数：两点距离
  const dist = (i, j) => Math.hypot(lm[i].x - lm[j].x, lm[i].y - lm[j].y);
  // 中点
  const mid = (i, j) => ({ x: (lm[i].x + lm[j].x) / 2, y: (lm[i].y + lm[j].y) / 2 });

  const shoulderMid = mid(MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER);
  const hipMid = mid(MP.LEFT_HIP, MP.RIGHT_HIP);

  // ── 1. 头前倾 (Forward Head Posture) ──
  // 耳道位置相对肩峰的水平偏移（侧面视图最准）
  const earPoint = mid(MP.LEFT_EAR, MP.RIGHT_EAR);
  const headHorizontalOffset = earPoint.x - shoulderMid.x;
  // 归一化为肩宽的比例
  const shoulderWidth = Math.abs(lm[MP.LEFT_SHOULDER].x - lm[MP.RIGHT_SHOULDER].x);
  const fhpRatio = Math.abs(headHorizontalOffset) / (shoulderWidth || 0.1);
  // FHP评分: 偏移<5%肩宽=100分，>25%=0分
  const fhpScore = Math.max(0, Math.min(100, 100 - (fhpRatio - 0.05) * 500));

  // ── 2. 圆肩 / 肩部前引 (Rounded Shoulders) ──
  // 肩峰相对于髋部的水平偏移比例（正面/背面）
  const leftShoulderForward = lm[MP.LEFT_SHOULDER].x - lm[MP.LEFT_HIP].x;
  const rightShoulderForward = lm[MP.RIGHT_SHOULDER].x - lm[MP.RIGHT_HIP].x;
  // 肩髋水平距与躯干高度比
  const torsoHeight = Math.abs(shoulderMid.y - hipMid.y);
  const roundedShoulderL = Math.abs(leftShoulderForward) / (torsoHeight || 0.1);
  const roundedShoulderR = Math.abs(rightShoulderForward) / (torsoHeight || 0.1);
  const roundedShoulderAvg = (roundedShoulderL + roundedShoulderR) / 2;
  const roundedShoulderScore = Math.max(0, Math.min(100, 100 - roundedShoulderAvg * 200));

  // ── 3. 高低肩 (Uneven Shoulders) ──
  const shoulderDiff = Math.abs(lm[MP.LEFT_SHOULDER].y - lm[MP.RIGHT_SHOULDER].y);
  const unevenShoulderScore = Math.max(0, Math.min(100, 100 - shoulderDiff * 1000));

  // ── 4. 高低髋 (Hip Drop / Pelvic Asymmetry) ──
  const hipDiff = Math.abs(lm[MP.LEFT_HIP].y - lm[MP.RIGHT_HIP].y);
  const hipDropScore = Math.max(0, Math.min(100, 100 - hipDiff * 1000));

  // ── 5. 骨盆前后倾 (Anterior/Posterior Pelvic Tilt) ──
  // 用髂前上棘区域(髋)和髂后上棘区域(近似为臀侧)的垂直关系判断
  // 正面/背面：用髋-肩中垂线偏移
  // 侧面：用髋相对肩的前后位置
  const pelvicTiltIndicator = hipMid.y - shoulderMid.y; // 髋肩垂直距占身高比
  const pelvicTiltScore = viewAngle === "side"
    ? Math.max(0, Math.min(100, 100 - Math.abs(pelvicTiltIndicator - 0.3) * 150))
    : Math.max(0, Math.min(100, 80)); // 非侧面视图此指标参考价值降低

  // ── 6. 脊柱侧弯筛查 (Scoliosis Screening) ──
  // 计算脊柱各段的中垂线偏移
  const spinePoints = [
    shoulderMid,
    mid(MP.LEFT_SHOULDER, MP.LEFT_HIP).x < mid(MP.RIGHT_SHOULDER, MP.RIGHT_HIP).x
      ? { x: (lm[MP.LEFT_SHOULDER].x + lm[MP.LEFT_HIP].x) / 2, y: (lm[MP.LEFT_SHOULDER].y + lm[MP.LEFT_HIP].y) / 2 }
      : { x: (lm[MP.RIGHT_SHOULDER].x + lm[MP.RIGHT_HIP].x) / 2, y: (lm[MP.RIGHT_SHOULDER].y + lm[MP.RIGHT_HIP].y) / 2 },
    hipMid,
  ];
  // 肩到髋的基准线
  const baselineX = spinePoints[0].x;
  const maxSpineDeviation = Math.max(
    Math.abs(spinePoints[1].x - baselineX),
    Math.abs(spinePoints[2].x - baselineX)
  );
  const scoliosisScore = Math.max(0, Math.min(100, 100 - maxSpineDeviation * 800));

  // ── 7. 膝超伸 (Hyperextended Knee) ──
  // 膝关节相对踝和髋的位置（小腿是否向后过度伸展）
  const leftKneeAngle = kneeExtensionAngle(lm, "left");
  const rightKneeAngle = kneeExtensionAngle(lm, "right");
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
  // 正常站立膝过伸约0-5°，超过10°视为超伸
  const hyperextensionScore = avgKneeAngle > 10
    ? Math.max(0, 100 - (avgKneeAngle - 10) * 8)
    : 100;

  // ── 8. 整体对称性 (Overall Symmetry) ──
  const leftSideLength = dist(MP.LEFT_SHOULDER, MP.LEFT_HIP) + dist(MP.LEFT_HIP, MP.LEFT_ANKLE);
  const rightSideLength = dist(MP.RIGHT_SHOULDER, MP.RIGHT_HIP) + dist(MP.RIGHT_HIP, MP.RIGHT_ANKLE);
  const symmetryRatio = Math.min(leftSideLength, rightSideLength) / Math.max(leftSideLength, rightSideLength);
  const symmetryScore = symmetryRatio * 100;

  // ── 综合评分 ──
  const metrics = {
    // 各项得分 (0-100, 100=完美)
    forwardHead: Math.round(fhpScore),
    roundedShoulders: Math.round(roundedShoulderScore),
    unevenShoulders: Math.round(unevenShoulderScore),
    hipDrop: Math.round(hipDropScore),
    pelvicTilt: Math.round(pelvicTiltScore),
    scoliosisScreen: Math.round(scoliosisScore),
    kneeHyperextension: Math.round(hyperextensionScore),
    overallSymmetry: Math.round(symmetryScore),

    // 原始数据（供LLM分析）
    raw: {
      fhpRatio: Math.round(fhpRatio * 100) / 100,
      shoulderDiff: Math.round(shoulderDiff * 1000) / 1000,
      hipDiff: Math.round(hipDiff * 1000) / 1000,
      spineDeviation: Math.round(maxSpineDeviation * 1000) / 1000,
      kneeAngle: Math.round(avgKneeAngle * 10) / 10,
      symmetryRatio: Math.round(symmetryRatio * 100) / 100,
      viewAngle,
    },

    // 关键点坐标（用于绘制标注）
    landmarks: lm.map(p => ({ x: p.x, y: p.y })),
  };

  // 加权总分
  metrics.overallScore = Math.round(
    metrics.forwardHead * 0.15 +
    metrics.roundedShoulders * 0.15 +
    metrics.unevenShoulders * 0.10 +
    metrics.hipDrop * 0.10 +
    metrics.pelvicTilt * 0.15 +
    metrics.scoliosisScreen * 0.20 +
    metrics.kneeHyperextension * 0.05 +
    metrics.overallSymmetry * 0.10
  );

  return metrics;
}

/**
 * 计算膝关节过伸角度
 */
function kneeExtensionAngle(lm, side) {
  const hip = side === "left" ? MP.LEFT_HIP : MP.RIGHT_HIP;
  const knee = side === "left" ? MP.LEFT_KNEE : MP.RIGHT_KNEE;
  const ankle = side === "left" ? MP.LEFT_ANKLE : MP.RIGHT_ANKLE;

  const v1 = { x: lm[hip].x - lm[knee].x, y: lm[hip].y - lm[knee].y };
  const v2 = { x: lm[ankle].x - lm[knee].x, y: lm[ankle].y - lm[knee].y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;

  let angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180 / Math.PI;
  // 过伸角度 = 180 - 膝关节夹角
  return Math.max(0, 180 - angle);
}

/**
 * 根据分数获取评级
 */
export function getPostureGrade(score) {
  if (score >= 90) return { grade: "A", label: "优秀", color: "#22c55e" };
  if (score >= 75) return { grade: "B", label: "良好", color: "#84cc16" };
  if (score >= 60) return { grade: "C", label: "一般", color: "#eab308" };
  if (score >= 40) return { grade: "D", label: "注意", color: "#f97316" };
  return { grade: "F", label: "预警", color: "#ef4444" };
}

/**
 * 根据指标生成问题列表
 */
export function generateIssues(metrics) {
  const issues = [];
  const addIssue = (key, title, desc, severity) => {
    if (metrics[key] < 70) {
      issues.push({ key, title, desc, severity, score: metrics[key] });
    }
  };

  addIssue("forwardHead", "头前倾 (FHP)",
    "头部相对肩膀向前偏移，常见于长期低头看手机/电脑。会增加颈椎压力，导致颈肩酸痛、头痛。", "high");

  addIssue("roundedShoulders", "圆肩/含胸",
    "肩部向前旋转内收，胸肌紧张、背部无力。影响呼吸效率，外观显佝偻。", "medium");

  addIssue("unevenShoulders", "高低肩",
    "双肩高度不一致，可能由单侧背包、习惯性单侧用力引起。长期可导致脊柱代偿。", "medium");

  addIssue("hipDrop", "骨盆侧倾",
    "双侧髂骨高度不等，常伴随长短腿或单侧承重习惯。可能导致腰痛和步态异常。", "medium");

  addIssue("pelvicTilt", "骨盆前后倾",
    "骨盆偏离中立位，前倾导致腰痛加剧，后倾导致姿势性扁平背。", "high");

  addIssue("scoliosisScreen", "脊柱侧弯风险",
    "脊柱呈现侧向弯曲迹象，建议进一步医学检查确认（尤其是亚当斯前屈测试）。", "high");

  addIssue("kneeHyperextension", "膝超伸",
    "膝关节过度伸直，增加韧带和关节软骨压力，长期可能导致膝关节不稳定。", "low");

  // 按严重程度排序
  const sevOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return issues;
}

/**
 * LLM 生成综合体态评估报告
 * @param {{metrics: object, issues: Array, viewAngle: string}} data
 * @returns {Promise<object>}
 */
export async function generatePostureReport(data) {
  const { metrics, issues, viewAngle } = data;

  const prompt = `你是一位拥有20年经验的**康复医学专家**和**体态矫正师**。请根据以下AI体态检测数据，生成一份专业、友好、可执行的中文体态评估报告。

## 检测数据
- **整体评分**: ${metrics.overallScore}/100 (${getPostureGrade(metrics.overallGrade || metrics.overallScore).label})
- **检测视角**: ${viewAngle === "front" ? "正面" : viewAngle === "side" ? "侧面" : "背面"}
- **头前倾**: ${metrics.forwardHead}/100 (偏移比例: ${metrics.raw.fhpRatio})
- **圆肩**: ${metrics.roundedShoulders}/100
- **高低肩**: ${metrics.unevenShoulders}/100 (差值: ${metrics.raw.shoulderDiff})
- **骨盆侧倾**: ${metrics.hipDrop}/100 (差值: ${metrics.raw.hipDiff})
- **骨盆前后倾**: ${metrics.pelvicTilt}/100
- **脊柱侧弯筛查**: ${metrics.scoliosisScreen}/100 (偏移: ${metrics.raw.spineDeviation})
- **膝超伸**: ${metrics.kneeHyperextension}/100 (角度: ${metrics.raw.kneeAngle}°)
- **整体对称性**: ${metrics.overallSymmetry}/100

## 已识别问题 (${issues.length}个)
${issues.map(i => `- **${i.title}** (得分${i.score}/100, ${i.severity === "high" ? "严重" : i.severity === "medium" ? "中等" : "轻微"}): ${i.desc}`).join("\n")}

## 输出要求（严格JSON格式）
请返回以下JSON结构（不要加markdown代码块标记）：
{
  "summary": "一段话总结整体体态状况，语气鼓励但诚实（50-80字）",
  "problems": [
    {
      "name": "问题名称",
      "severity": "high|medium|low",
      "cause": "成因分析（结合现代人久坐/手机使用等生活习惯）",
      "risk": "不纠正的风险（简短）",
      "correctionExercises": ["矫正动作1（中文，具体可做）", "动作2", "动作3"],
      "dailyHabits": ["日常改善习惯1", "习惯2"],
      "timeline": "预计改善周期（如'2-4周可见效果'）"
    }
  ],
  "overallPlan": "整体矫正优先级排序和训练计划概述（100字左右）",
  "warning": "需要就医的红线信号（如有），没有则写null"
}`;

  try {
    const response = await callLLM(prompt, { temperature: 0.4 });
    const jsonStr = extractJSON(response);
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
    throw new Error("LLM返回格式异常");
  } catch (err) {
    console.warn("Posture report LLM failed:", err);
    // 降级：基于规则生成基础报告
    return generateFallbackReport(metrics, issues);
  }
}

function extractJSON(text) {
  // 尝试提取JSON
  const jsonMatch = text.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  return null;
}

function generateFallbackReport(metrics, issues) {
  return {
    summary: `你的体态整体评分为${metrics.overallScore}分，${getPostureGrade(metrics.overallScore).label}级别。${issues.length > 0 ? `检测到${issues.length}个需要注意的问题` : "各项指标基本正常"}。建议坚持针对性训练，通常2-4周可见改善。`,
    problems: issues.map(i => ({
      name: i.title,
      severity: i.severity,
      cause: "长期不良姿势积累所致",
      risk: "长期可能引发疼痛或加重体态问题",
      correctionExercises: ["猫牛式拉伸", "靠墙站立", "肩胛骨收缩练习"],
      dailyHabits: ["调整屏幕高度", "每小时起身活动", "睡眠姿势调整"],
      timeline: "2-4周",
    })),
    overallPlan: "建议按严重程度依次改善：先处理高分值问题（如头前倾、脊柱），再逐步优化其他指标。每天15-20分钟针对性训练。",
    warning: metrics.scoliosisScreen < 40 ? "脊柱侧弯风险较高，建议到医院骨科/康复科做进一步检查。" : null,
  };
}

/**
 * 矫正动作数据库（针对每个问题的推荐动作）
 */
export const CORRECTION_EXERCISES = {
  forwardHead: [
    { name: "收下巴运动 (Chin Tucks)", duration: "10次×3组", difficulty: "简单", target: "颈深屈肌" },
    { name: "上斜方肌拉伸", duration: "每侧30秒×3组", difficulty: "简单", target: "上斜方肌/肩胛提肌" },
    { name: "颈部等长抗阻", duration: "每方向10秒×3组", difficulty: "中等", target: "颈深层稳定肌" },
  ],
  roundedShoulders: [
    { name: "门框拉伸 (Doorway Stretch)", duration: "30秒×3组", difficulty: "简单", target: "胸大肌/胸小肌" },
    { name: "面拉 (Face Pull)", duration: "15次×3组", difficulty: "中等", target: "菱形肌/中下斜方肌" },
    { name: "W字伸展", duration: "15次×3组", difficulty: "简单", target: "肩外旋肌群" },
  ],
  unevenShoulders: [
    { name: "单臂侧弯拉伸", duration: "每侧30秒×3组", difficulty: "简单", target: "腰方肌/腹外斜肌" },
    { name: "肩胛提肌拉伸", duration: "每侧30秒×3组", difficulty: "简单", target: "肩胛提肌" },
    { name: "单侧负重农夫行走", duration: "每侧30米×3组", difficulty: "中等", target: "核心稳定肌" },
  ],
  hipDrop: [
    { name: "臀桥 (Glute Bridge)", duration: "15次×3组", difficulty: "简单", target: "臀大肌" },
    { name: "蚌式开合 (Clamshell)", duration: "每侧15次×3组", difficulty: "简单", target: "臀中肌" },
    { name: "单腿硬拉", duration: "每侧10次×3组", difficulty: "中等", target: "臀肌/腘绳肌" },
  ],
  pelvicTilt: [
    { name: "骨盆后倾练习", duration: "10秒保持×10次", difficulty: "简单", target: "腹横肌/臀大肌" },
    { name: "婴儿式拉伸 (Child's Pose)", duration: "30秒×3组", difficulty: "简单", target: "腰椎伸肌/髂腰肌" },
    { name: "死虫子 (Dead Bug)", duration: "每侧10次×3组", difficulty: "中等", target: "核心稳定" },
  ],
  scoliosisScreen: [
    { name: "猫牛式 (Cat-Cow)", duration: "10次×3组", difficulty: "简单", target: "脊柱灵活性" },
    { name: "鸟狗式 (Bird-Dog)", duration: "每侧10次×3组", difficulty: "中等", target: "核心+脊柱稳定" },
    { name: "游泳式伸展 (Swimmers)", duration: "每侧10次×3组", difficulty: "中等", target: "脊旁肌/臀部" },
  ],
  kneeHyperextension: [
    { name: "微蹲感知训练", duration: "10次×3组", difficulty: "简单", target: "膝关节本体感觉" },
    { name: "腘绳肌离心强化", duration: "10次×3组", difficulty: "中等", target: "腘绳肌" },
    { name: "提踵训练", duration: "15次×3组", difficulty: "简单", target: "小腿三头肌" },
  ],
};
