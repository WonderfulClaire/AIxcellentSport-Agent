"use client";

import { useCallback, useRef, useState } from "react";
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import {
  computePostureMetrics,
  getPostureGrade,
  generateIssues,
  generatePostureReport,
  CORRECTION_EXERCISES,
} from "../agent/postureAnalyzer.js";
import { loadAgentConfig } from "../agent/index.js";

type ViewAngle = "front" | "side" | "back";
type AnalysisPhase = "idle" | "uploading" | "detecting" | "analyzing" | "done" | "error";

interface PostureResult {
  metrics: ReturnType<typeof computePostureMetrics>;
  issues: ReturnType<typeof generateIssues>;
  report?: {
    summary: string;
    problems: Array<{
      name: string;
      severity: string;
      cause: string;
      risk: string;
      correctionExercises: string[];
      dailyHabits: string[];
      timeline: string;
    }>;
    overallPlan: string;
    warning: string | null;
  };
  viewAngle: ViewAngle;
  imageDataUrl?: string;
}

const VIEW_OPTIONS: Array<{ value: ViewAngle; label: string; hint: string }> = [
  { value: "front", label: "正面照", hint: "正对镜头，双臂自然下垂，全身入镜" },
  { value: "side", label: "侧面照", hint: "侧身站立，左/右侧对镜头（更准确）" },
  { value: "back", label: "背面照", hint: "背对镜头，便于分析脊柱和肩胛骨" },
];

export default function PostureAssessment() {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [viewAngle, setViewAngle] = useState<ViewAngle>("front");
  const [result, setResult] = useState<PostureResult | null>(null);
  const [activeProblem, setActiveProblem] = useState<number | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  // 加载模型
  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker/float16/latest.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    } catch (err) {
      console.error("Failed to load PoseLandmarker:", err);
      throw err;
    }
  }, []);

  // 处理图片上传
  const handleImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件（JPG/PNG/WebP）");
      return;
    }

    setPhase("uploading");
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        setPhase("detecting");

        // 初始化模型
        const landmarker = await loadModel();

        // 在 canvas 上绘制并检测
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not found");
        const ctx = canvas.getContext("2d")!;

        // 设置 canvas 尺寸
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width, maxW / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        // 姿态检测
        const mpResult = landmarker.detectForImage(canvas, performance.now());

        if (!mpResult.landmarks || mpResult.landmarks.length === 0) {
          setPhase("error");
          alert("未能检测到人体姿态。请确保：\n• 全身清晰可见\n• 光线充足\n• 站立姿势自然");
          return;
        }

        const landmarks = mpResult.landmarks[0];

        // 绘制骨骼标注
        drawPostureAnnotation(ctx, landmarks, canvas.width, canvas.height);

        // 计算体态指标
        setPhase("analyzing");
        const metrics = computePostureMetrics(landmarks, viewAngle);
        const issues = generateIssues(metrics);

        const partialResult: PostureResult = { metrics, issues, viewAngle, imageDataUrl };
        setResult(partialResult);

        // LLM 生成报告
        if (useLLM) {
          try {
            const config = loadAgentConfig();
            if (config?.apiKey) {
              const report = await generatePostureReport({
                metrics,
                issues,
                viewAngle,
              });
              setResult((prev) => prev ? { ...prev, report } : partialResult);
            } else {
              console.info("No API key, using rule-based report");
            }
          } catch (err) {
            console.warn("LLM report failed:", err);
          }
        }

        setPhase("done");
      } catch (err) {
        console.error("Analysis error:", err);
        setPhase("error");
        alert("分析出错：" + (err as Error).message);
      }
    };
    img.src = imgUrl;
    imgRef.current = img;
  }, [loadModel, viewAngle, useLLM]);

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImage(file);
  }, [handleImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  // 渲染指标卡片
  const renderMetricCard = (key: string, label: string, score: number, icon: string) => {
    const grade = getPostureGrade(score);
    return (
      <div className="pa-metric-card" key={key}>
        <div className="pa-metric-header">
          <span className="pa-metric-icon">{icon}</span>
          <span className="pa-metric-label">{label}</span>
          <span className="pa-metric-score" style={{ color: grade.color }}>{score}</span>
        </div>
        <div className="pa-metric-bar">
          <div
            className="pa-metric-fill"
            style={{ width: `${score}%`, backgroundColor: grade.color }}
          />
        </div>
        <span className="pa-metric-grade" style={{ color: grade.color }}>
          {grade.grade} · {grade.label}
        </span>
      </div>
    );
  };

  return (
    <div className="posture-assessment">
      {/* 头部 */}
      <div className="pa-header">
        <h2>🧍 AI 体态评估</h2>
        <p>上传全身照片，AI 分析你的体态问题并给出矫正方案</p>
      </div>

      {/* 上传区域 */}
      {phase === "idle" && (
        <div className="pa-upload-section">
          {/* 视角选择 */}
          <div className="pa-view-selector">
            <span className="pa-view-label">拍摄视角：</span>
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v.value}
                className={`pa-view-btn ${viewAngle === v.value ? "active" : ""}`}
                onClick={() => setViewAngle(v.value)}
              >
                <span className="pa-view-icon">
                  {v.value === "front" ? "🧑" : v.value === "side" ? "🚶" : "🔙"}
                </span>
                <span>{v.label}</span>
                <small>{v.hint}</small>
              </button>
            ))}
          </div>

          {/* LLM 开关 */}
          <div className="pa-llm-toggle">
            <label>
              <input type="checkbox" checked={useLLM} onChange={(e) => setUseLLM(e.target.checked)} />
              <span>启用 AI 深度分析（生成个性化报告）</span>
            </label>
          </div>

          {/* 拖拽区 */}
          <div
            className={`pa-dropzone ${phase === "uploading" ? "uploading" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileRef.current?.click()}
          >
            <div className="pa-dropzone-content">
              <span className="pa-dropzone-icon">📸</span>
              <p>点击或拖拽上传照片</p>
              <p className="pa-dropzone-hint">支持 JPG / PNG / WebP，建议穿紧身衣/运动装</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
          </div>

          {/* 提示 */}
          <div className="pa-tips">
            <h4>💡 拍摄建议</h4>
            <ul>
              <li>距离相机 2-3 米，确保全身入镜</li>
              <li>双脚分开与肩同宽，自然站立</li>
              <li>穿贴身衣物（避免宽松衣服遮挡身体轮廓）</li>
              <li>光线均匀正面照射</li>
              <li><strong>侧面照最准</strong>——能最好地判断头前倾和骨盆问题</li>
            </ul>
          </div>
        </div>
      )}

      {/* 分析中 */}
      {(phase === "uploading" || phase === "detecting" || phase === "analyzing") && (
        <div className="pa-analyzing">
          <div className="pa-spinner" />
          <p>
            {phase === "uploading" && "正在读取图片…"}
            {phase === "detecting" && "正在识别 33 个关键点…"}
            {phase === "analyzing" && "正在生成体态评估报告…"}
          </p>
          <div className="pa-progress-steps">
            <span className={["uploading", "detecting", "analyzing", "done"].includes(phase) ? "done" : ""}>✓ 读取</span>
            <span className={["detecting", "analyzing", "done"].includes(phase) ? "done" : ""}>✓ 检测</span>
            <span className={["analyzing", "done"].includes(phase) ? "done" : ""}>✓ 分析</span>
            <span className={phase === "done" ? "done" : ""}>✓ 报告</span>
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {phase === "done" && result && (
        <div className="pa-result">
          {/* 左侧：图片+标注 */}
          <div className="pa-result-left">
            <div className="pa-image-container">
              <canvas ref={canvasRef} className="pa-canvas" />
              {result.imageDataUrl && (
                <img src={result.imageDataUrl} alt="体态分析标注图" className="pa-analyzed-img" />
              )}
            </div>

            {/* 总分卡片 */}
            <div className="pa-total-score">
              <div className="pa-score-circle" style={{
                background: `conic-gradient(${getPostureGrade(result.metrics.overallScore).color} ${result.metrics.overallScore * 3.6deg, #e5e7eb ${result.metrics.overallScore * 3.6deg})`
              }}>
                <span className="pa-score-number" style={{ color: getPostureGrade(result.metrics.overallScore).color }}>
                  {result.metrics.overallScore}
                </span>
              </div>
              <div className="pa-score-info">
                <strong>体态综合评分</strong>
                <span className="pa-grade-badge" style={{ backgroundColor: getPostureGrade(result.metrics.overallScore).color }}>
                  {getPostureGrade(result.metrics.overallScore).grade}级 · {getPostureGrade(result.metrics.overallScore).label}
                </span>
                <small>{result.viewAngle === "front" ? "正面" : result.viewAngle === "side" ? "侧面" : "背面"}视图</small>
              </div>
            </div>

            {/* 重新分析 */}
            <button className="pa-retry-btn" onClick={() => { setPhase("idle"); setResult(null); }}>
              📸 重新拍照分析
            </button>
          </div>

          {/* 右侧：详细报告 */}
          <div className="pa-result-right">
            {/* AI 总结 */}
            {result.report?.summary && (
              <div className="pa-summary-card">
                <h4>📋 AI 评估总结</h4>
                <p>{result.report.summary}</p>
              </div>
            )}

            {/* 警告 */}
            {result.report?.warning && (
              <div className="pa-warning-card">
                <h4>⚠️ 注意</h4>
                <p>{result.report.warning}</p>
              </div>
            )}

            {/* 分项指标 */}
            <div className="pa-metrics-grid">
              <h4>📊 分项指标</h4>
              {renderMetricCard("forwardHead", "头前倾", result.metrics.forwardHead, "🗣️")}
              {renderMetricCard("roundedShoulders", "圆肩/含胸", result.metrics.roundedShoulders, "🫁")}
              {renderMetricCard("unevenShoulders", "高低肩", result.metrics.unevenShoulders, "🔄")}
              {renderMetricCard("hipDrop", "骨盆侧倾", result.metrics.hipDrop, "🦴")}
              {renderMetricCard("pelvicTilt", "骨盆前后倾", result.metrics.pelvicTilt, "⚖️")}
              {renderMetricCard("scoliosisScreen", "脊柱侧弯筛查", result.metrics.scoliosisScreen, "📏")}
              {renderMetricCard("kneeHyperextension", "膝超伸", result.metrics.kneeHyperextension, "🦵")}
              {renderMetricCard("overallSymmetry", "整体对称性", result.metrics.overallSymmetry, "⭐")}
            </div>

            {/* 问题列表 */}
            {result.issues.length > 0 && (
              <div className="pa-issues-section">
                <h4>🔍 发现的问题 ({result.issues.length})</h4>
                {result.issues.map((issue, idx) => {
                  const llmProblem = result.report?.problems?.find(p =>
                    p.name.includes(issue.title.split(" ")[0]) || issue.title.includes(p.name.split(" ")[0])
                  );
                  const isActive = activeProblem === idx;

                  return (
                    <div key={issue.key} className={`pa-issue-card ${isActive ? "active" : ""}`} onClick={() => setActiveProblem(isActive ? null : idx)}>
                      <div className="pa-issue-header">
                        <span className={`pa-severity ${issue.severity}`}>
                          {issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "🟢"}
                        </span>
                        <strong>{issue.title}</strong>
                        <span className="pa-issue-score" style={{ color: getPostureGrade(issue.score).color }}>
                          {issue.score}分
                        </span>
                      </div>

                      {isActive && (
                        <div className="pa-issue-detail">
                          <p className="pa-issue-desc">{issue.desc}</p>

                          {llmProblem ? (
                            <>
                              <div className="pa-issue-sub">
                                <h5>成因</h5>
                                <p>{llmProblem.cause}</p>
                              </div>
                              <div className="pa-issue-sub">
                                <h5>风险</h5>
                                <p>{llmProblem.risk}</p>
                              </div>
                              <div className="pa-issue-sub">
                                <h5>🏃 矫正动作</h5>
                                <div className="pa-exercises">
                                  {llmProblem.correctionExercises.map((ex, i) => (
                                    <span key={i} className="pa-exercise-tag">{ex}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="pa-issue-sub">
                                <h5>💡 日常习惯</h5>
                                <ul>
                                  {llmProblem.dailyHabits.map((h, i) => <li key={i}>{h}</li>)}
                                </ul>
                              </div>
                              <div className="pa-issue-timeline">
                                ⏱️ 预计改善周期：{llmProblem.timeline}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* 使用内置矫正动作库 */}
                              <div className="pa-issue-sub">
                                <h5>🏃 推荐矫正动作</h5>
                                <div className="pa-exercise-list">
                                  {(CORRECTION_EXERCISES[issue.key as keyof typeof CORRECTION_EXERCISES] || []).map((ex, i) => (
                                    <div key={i} className="pa-exercise-item">
                                      <span className="pa-ex-name">{ex.name}</span>
                                      <span className="pa-ex-meta">{ex.duration} · {ex.difficulty} · 目标：{ex.target}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 整体计划 */}
            {result.report?.overallPlan && (
              <div className="pa-plan-card">
                <h4>📋 整体矫正计划</h4>
                <p>{result.report.overallPlan}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {phase === "error" && (
        <div className="pa-error">
          <p>❌ 分析失败</p>
          <button onClick={() => setPhase("idle")}>重新开始</button>
        </div>
      )}
    </div>
  );
}

// ─── 在图片上绘制体态标注 ──────────────────────────

function drawPostureAnnotation(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }>,
  w: number,
  h: number
) {
  const utils = new DrawingUtils(ctx);

  // 绘制骨架
  const connections = [
    [11, 12], // shoulders
    [11, 13], [13, 15], // left arm
    [12, 14], [14, 16], // right arm
    [11, 23], [12, 24], // torso
    [23, 24], // hips
    [23, 25], [25, 27], // left leg
    [24, 26], [26, 28], // right leg
    [27, 29], [29, 31], // left foot
    [28, 30], [30, 32], // right foot
    [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], // face
    [9, 10], // mouth
    [0, 7], [0, 8], [7, 9], [8, 10], // ears to mouth
    [0, 11], [0, 12], // head to shoulders
  ];

  // 关键点映射到像素坐标
  const pixelPoints = landmarks.map(lm => ({ x: lm.x * w, y: lm.y * h }));

  // 绘制连接线
  ctx.strokeStyle = "rgba(34,197,94,0.6)";
  ctx.lineWidth = 2;
  connections.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(pixelPoints[a].x, pixelPoints[a].y);
    ctx.lineTo(pixelPoints[b].x, pixelPoints[b].y);
    ctx.stroke();
  });

  // 绘制关键点（不同大小区分重要性）
  const importantPoints = [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28]; // 头耳肩髋膝踝
  pixelPoints.forEach((pt, i) => {
    const radius = importantPoints.includes(i) ? 5 : 3;
    ctx.fillStyle = importantPoints.includes(i) ? "#22c55e" : "#86efac";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 标注关键部位名称
    const labels: Record<number, string> = {
      0: "鼻", 7: "左耳", 8: "右耳",
      11: "左肩", 12: "右肩",
      23: "左髋", 24: "右髋",
      25: "左膝", 26: "右膝",
      27: "左踝", 28: "右踝",
    };
    if (labels[i]) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.font = "11px system-ui";
      const text = labels[i];
      const tw = ctx.measureText(text).width;
      ctx.fillRect(pt.x - tw / 2 - 3, pt.y - radius - 16, tw + 6, 14);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(text, pt.x, pt.y - radius - 5);
    }
  });

  // 绘制中垂线参考线（用于判断对称性）
  const shoulderMidX = ((pixelPoints[11]?.x || 0) + (pixelPoints[12]?.x || 0)) / 2;
  const hipMidX = ((pixelPoints[23]?.x || 0) + (pixelPoints[24]?.x || 0)) / 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(239,68,68,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shoulderMidX, 0);
  ctx.lineTo(hipMidX, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // 标注"中垂线"
  ctx.fillStyle = "rgba(239,68,68,0.7)";
  ctx.font = "10px system-ui";
  ctx.fillText("中垂线", shoulderMidX + 5, 20);
}
