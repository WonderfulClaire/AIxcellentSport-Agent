"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { CoachAgent, AgentMemory, loadAgentConfig, runMultiAgent } from "./agent/index.js";

type Exercise = "squat" | "pushup" | "jack";
type ModelState = "idle" | "loading" | "ready" | "error";

const EXERCISES: Array<{
  id: Exercise;
  name: string;
  detail: string;
  focus: string;
}> = [
  { id: "squat", name: "深蹲", detail: "膝髋轨迹 · 躯干角度", focus: "下肢" },
  { id: "pushup", name: "俯卧撑", detail: "肘部角度 · 身体直线", focus: "上肢" },
  { id: "jack", name: "开合跳", detail: "手脚协调 · 动作幅度", focus: "全身" },
];

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

function angle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const cosine =
    (ab.x * cb.x + ab.y * cb.y) /
    (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const predictRef = useRef<() => void>(() => undefined);
  const lastVideoTimeRef = useRef(-1);
  const phaseRef = useRef<"up" | "down">("up");
  const repCountRef = useRef(0);
  const agentRef = useRef<CoachAgent | null>(null);

  const [exercise, setExercise] = useState<Exercise>("squat");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [isTraining, setIsTraining] = useState(false);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(92);
  const [jointAngle, setJointAngle] = useState(168);
  const [fps, setFps] = useState(0);
  const [feedback, setFeedback] = useState("准备好后，退后两步并让全身进入画面");
  const [feedbackTone, setFeedbackTone] = useState<"good" | "warn">("good");
  const [agentFocus, setAgentFocus] = useState<string | null>(null);
  const [report, setReport] = useState<null | {
    form: { issues: string[] };
    coaching: { message: string; tone: "good" | "warn"; focusArea: string | null };
    progress: { averageScore: number | null; totalReps: number; recurringIssues: Array<{ issue: string; count: number }> };
    plan: { nextPlan: string[]; generatedBy: "llm" | "heuristic" };
  }>(null);
  const [speakOn, setSpeakOn] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [spark, setSpark] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const lastFpsTime = useRef(0);
  const frameCount = useRef(0);

  const stopTraining = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsTraining(false);
    setFps(0);
  }, []);

  useEffect(() => {
    return () => {
      stopTraining();
      landmarkerRef.current?.close();
    };
  }, [stopTraining]);

  // 初始化教练智能体（记忆 + 可选 LLM 配置，均未配置密钥时走启发式兜底）
  useEffect(() => {
    agentRef.current = new CoachAgent({
      memory: new AgentMemory(),
      config: loadAgentConfig(),
    });
  }, []);

  // 浏览器端语音播报（教练出声）
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.05;
    u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  // 一次动作完成后，把指标交给多智能体编排（感知→记忆→规划→反馈），
  // 产出结构化「训练报告」并实时更新教练反馈。
  const triggerAgent = useCallback(
    (metric: {
      exercise: Exercise;
      repIndex: number;
      score: number;
      jointAngle: number;
      symmetryError?: number;
      kneeGap?: number;
      ankleGap?: number;
      bodyLine?: number;
    }) => {
      const agent = agentRef.current;
      if (!agent) return;
      runMultiAgent(metric, { memory: agent.memory, config: agent.config })
        .then((res) => {
          setFeedback(res.coaching.message);
          setFeedbackTone(res.coaching.tone);
          if (res.coaching.focusArea) setAgentFocus(res.coaching.focusArea);
          setReport(res);
          setSpark(agent.memory.getHistory(metric.exercise).map((r) => r.score));
          if (speakOn) speak(res.coaching.message);
        })
        .catch(() => {
          /* 智能体异常时保留原有实时反馈，保证不中断训练 */
        });
    },
    [speakOn, speak],
  );

  // 设定训练目标（驱动 PlanGenerator 生成目标导向的计划）
  const addGoal = useCallback(() => {
    const g = goalInput.trim();
    if (!g) return;
    const agent = agentRef.current;
    const next = [...goals, g];
    if (agent) agent.memory.setGoals(next);
    setGoals(next);
    setGoalInput("");
  }, [goalInput, goals]);

  const removeGoal = useCallback((g: string) => {
    const agent = agentRef.current;
    const next = goals.filter((x) => x !== g);
    if (agent) agent.memory.setGoals(next);
    setGoals(next);
  }, [goals]);

  const analyzePose = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      if (exercise === "squat") {
        const left = angle(landmarks[23], landmarks[25], landmarks[27]);
        const right = angle(landmarks[24], landmarks[26], landmarks[28]);
        const kneeAngle = (left + right) / 2;
        const kneeGap = Math.abs(landmarks[25].x - landmarks[26].x);
        const ankleGap = Math.abs(landmarks[27].x - landmarks[28].x);
        const symmetryPenalty = Math.abs(left - right) * 0.85;
        const valgusPenalty = kneeGap < ankleGap * 0.63 ? 18 : 0;

        setJointAngle(Math.round(kneeAngle));
        setScore(Math.round(clamp(100 - symmetryPenalty - valgusPenalty)));

        if (kneeAngle < 102 && phaseRef.current === "up") {
          phaseRef.current = "down";
          setFeedback("很好，髋部继续向后坐，保持脚掌稳定");
          setFeedbackTone("good");
        } else if (kneeAngle > 158 && phaseRef.current === "down") {
          phaseRef.current = "up";
          repCountRef.current += 1;
          setReps(repCountRef.current);
          triggerAgent({
            exercise: "squat",
            repIndex: repCountRef.current,
            score: Math.round(clamp(100 - symmetryPenalty - valgusPenalty)),
            jointAngle: Math.round(kneeAngle),
            symmetryError: Math.abs(left - right),
            kneeGap,
            ankleGap,
          });
        } else if (valgusPenalty) {
          setFeedback("膝盖有内扣趋势，尝试朝脚尖方向打开");
          setFeedbackTone("warn");
        }
      }

      if (exercise === "pushup") {
        const elbow =
          (angle(landmarks[11], landmarks[13], landmarks[15]) +
            angle(landmarks[12], landmarks[14], landmarks[16])) /
          2;
        const bodyLine = angle(landmarks[11], landmarks[23], landmarks[27]);
        setJointAngle(Math.round(elbow));
        setScore(Math.round(clamp(100 - Math.abs(175 - bodyLine) * 1.4)));
        if (elbow < 88 && phaseRef.current === "up") phaseRef.current = "down";
        if (elbow > 158 && phaseRef.current === "down") {
          phaseRef.current = "up";
          repCountRef.current += 1;
          setReps(repCountRef.current);
          triggerAgent({
            exercise: "pushup",
            repIndex: repCountRef.current,
            score: Math.round(clamp(100 - Math.abs(175 - bodyLine) * 1.4)),
            jointAngle: Math.round(elbow),
            bodyLine,
          });
        }
        if (bodyLine < 158) {
          setFeedback("髋部略低，收紧核心并保持肩髋踝成一线");
          setFeedbackTone("warn");
        } else {
          setFeedback("身体线条稳定，继续控制下降速度");
          setFeedbackTone("good");
        }
      }

      if (exercise === "jack") {
        const handsHigh = landmarks[15].y < landmarks[0].y && landmarks[16].y < landmarks[0].y;
        const feetWide = Math.abs(landmarks[27].x - landmarks[28].x) > 0.34;
        const open = handsHigh && feetWide;
        setJointAngle(Math.round(Math.abs(landmarks[15].x - landmarks[16].x) * 180));
        setScore(open ? 96 : 86);
        if (open && phaseRef.current === "up") phaseRef.current = "down";
        if (!open && phaseRef.current === "down") {
          phaseRef.current = "up";
          repCountRef.current += 1;
          setReps(repCountRef.current);
          triggerAgent({
            exercise: "jack",
            repIndex: repCountRef.current,
            score: open ? 96 : 86,
            jointAngle: Math.round(Math.abs(landmarks[15].x - landmarks[16].x) * 180),
          });
        }
        setFeedback(open ? "幅度到位，落地时保持膝盖柔软" : "双手举过头顶，脚步再打开一些");
        setFeedbackTone(open ? "good" : "warn");
      }
    },
    [exercise, triggerAgent],
  );

  const predict = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        canvas.width = width;
        canvas.height = height;
        const result = landmarker.detectForVideo(video, performance.now());
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, width, height);
        if (context && result.landmarks[0]) {
          const drawing = new DrawingUtils(context);
          drawing.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
            color: "#55c8ff",
            lineWidth: 4,
          });
          drawing.drawLandmarks(result.landmarks[0], {
            color: "#fff4b8",
            fillColor: "#071521",
            lineWidth: 2,
            radius: 4,
          });
          analyzePose(result.landmarks[0]);
        } else {
          setFeedback("没有检测到完整人体，请退后并保持光线充足");
          setFeedbackTone("warn");
        }
        lastVideoTimeRef.current = video.currentTime;
        frameCount.current += 1;
        const now = performance.now();
        if (now - lastFpsTime.current > 1000) {
          setFps(Math.round((frameCount.current * 1000) / (now - lastFpsTime.current)));
          frameCount.current = 0;
          lastFpsTime.current = now;
        }
      }
    }
    frameRef.current = requestAnimationFrame(() => predictRef.current());
  }, [analyzePose]);

  useEffect(() => {
    predictRef.current = predict;
  }, [predict]);

  const startTraining = async () => {
    setErrorMessage("");
    setModelState("loading");
    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setModelState("ready");
      setIsTraining(true);
      repCountRef.current = 0;
      lastFpsTime.current = performance.now();
      frameCount.current = 0;
      frameRef.current = requestAnimationFrame(() => predictRef.current());
    } catch (error) {
      console.error(error);
      setModelState("error");
      setErrorMessage("无法启动摄像头或加载姿态模型。请允许摄像头权限并检查网络后重试。");
      stopTraining();
    }
  };

  const selectExercise = (next: Exercise) => {
    setExercise(next);
    setReps(0);
    setScore(92);
    repCountRef.current = 0;
    phaseRef.current = "up";
    setAgentFocus(null);
    setFeedback("已切换动作，让全身进入画面后开始训练");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AIxcellentSport 首页">
          <span className="brand-mark">AIX</span>
          <span>AIxcellentSport</span>
        </a>
        <nav aria-label="主导航">
          <a href="#coach">实时教练</a>
          <a href="#how">技术原理</a>
          <a href="https://github.com/WonderfulClaire/AIxcellentSport-Agent" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
        <span className="privacy-pill"><i /> ON-DEVICE AI</span>
        <span className="privacy-pill"><i /> AGENTIC COACH</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">你的动作，AI 看得见</span>
          <h1>练得更准。<br /><em>不是更狠。</em></h1>
          <p>浏览器端实时姿态识别，追踪 33 个人体关键点，在动作发生的当下发现代偿、给出可执行反馈。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={startTraining} disabled={modelState === "loading" || isTraining}>
              {modelState === "loading" ? "正在唤醒 AI…" : isTraining ? "训练进行中" : "开启实时教练"}
              <span>→</span>
            </button>
            <a className="text-link" href="#how">了解它如何工作</a>
          </div>
          <div className="trust-row">
            <span><b>33</b> 关键点</span>
            <span><b>&lt;50ms</b> 本地推理</span>
            <span><b>0</b> 视频上传</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="姿态识别示意">
          <div className="scan-grid" />
          <div className="figure">
            <span className="head" />
            <span className="torso" />
            <span className="limb arm-left" />
            <span className="limb arm-right" />
            <span className="limb leg-left" />
            <span className="limb leg-right" />
            {["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map((point) => <i key={point} className={`pose-point ${point}`} />)}
          </div>
          <div className="float-card card-score"><small>动作质量</small><strong>92</strong><span>/ 100</span></div>
          <div className="float-card card-status"><i /> 躯干稳定</div>
          <div className="angle-chip">膝关节 94°</div>
        </div>
      </section>

      <section className="coach-section" id="coach">
        <div className="section-heading">
          <div><span className="eyebrow">LIVE MOTION LAB</span><h2>实时动作实验室</h2></div>
          <p>选择动作，打开摄像头。所有视频帧只在你的设备上处理。</p>
        </div>

        <div className="exercise-tabs" role="tablist" aria-label="选择训练动作">
          {EXERCISES.map((item) => (
            <button key={item.id} className={exercise === item.id ? "active" : ""} onClick={() => selectExercise(item.id)} role="tab" aria-selected={exercise === item.id}>
              <span>{item.name}</span><small>{item.detail}</small><b>{item.focus}</b>
            </button>
          ))}
        </div>

        <div className="coach-grid">
          <div className={`camera-stage ${isTraining ? "is-live" : ""}`}>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            {!isTraining && (
              <div className="camera-empty">
                <div className="camera-icon">◎</div>
                <strong>摄像头尚未开启</strong>
                <span>建议将设备放在身体侧前方 2–3 米处</span>
                <button onClick={startTraining} disabled={modelState === "loading"}>
                  {modelState === "loading" ? "模型加载中…" : "允许摄像头并开始"}
                </button>
              </div>
            )}
            <div className="live-badge"><i /> {isTraining ? `LIVE · ${fps} FPS` : "READY"}</div>
            <div className="privacy-note">🔒 视频不会离开此设备</div>
          </div>

          <aside className="metrics-panel">
            <div className="metric-hero"><span>动作评分</span><strong>{score}</strong><small>/100</small><div className="score-bar"><i style={{ width: `${score}%` }} /></div></div>
            <div className="metric-pair">
              <div><span>完成次数</span><strong>{reps}<small> 次</small></strong></div>
              <div><span>关键角度</span><strong>{jointAngle}<small>°</small></strong></div>
            </div>
            <div className={`feedback-card ${feedbackTone}`}>
              <span>{feedbackTone === "good" ? "✓" : "!"}</span>
              <div><small>AI COACH</small><p>{feedback}</p></div>
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {agentFocus && (
              <div className="agent-focus">
                <span>🤖 Agent 重点</span>
                <strong>{agentFocus}</strong>
              </div>
            )}
            {report && (
              <div className="report-card">
                <span className="report-title">🤖 训练报告</span>
                <div className="report-row"><small>本次问题</small><p>{report.form.issues.length ? report.form.issues.join("、") : "动作标准，暂无可纠正项"}</p></div>
                <div className="report-row"><small>阶段进展</small><p>平均分 {report.progress.averageScore ?? "—"} · 已练 {report.progress.totalReps} 次</p></div>
                {report.progress.recurringIssues.length > 0 && (
                  <div className="report-row"><small>反复问题</small><p>{report.progress.recurringIssues.map((r) => `${r.issue}(${r.count})`).join("、")}</p></div>
                )}
                <div className="report-row"><small>下一步</small><ul>{report.plan.nextPlan.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                <small className="report-src">由 {report.plan.generatedBy === "llm" ? "LLM" : "确定性启发式"} 生成</small>
              </div>
            )}

            <div className="goal-box">
              <span>🎯 训练目标</span>
              <div className="goal-input-row">
                <input
                  className="goal-input"
                  placeholder="如：改善膝盖内扣 / 增肌"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }}
                />
                <button className="goal-add" onClick={addGoal}>添加</button>
              </div>
              {goals.length > 0 && (
                <div className="goal-tags">
                  {goals.map((g) => (
                    <span key={g} className="goal-tag">{g}<button onClick={() => removeGoal(g)} aria-label="删除目标">×</button></span>
                  ))}
                </div>
              )}
            </div>

            {spark.length > 1 && (
              <div className="progress-card">
                <span>📈 动作质量趋势</span>
                <svg className="spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-label="动作质量趋势">
                  <polyline
                    fill="none"
                    stroke="var(--acid)"
                    strokeWidth="2"
                    points={spark.map((s, i) => `${8 + (i * (240 - 16)) / Math.max(1, spark.length - 1)},${40 - (Math.max(0, Math.min(100, s)) / 100) * 36}`).join(" ")}
                  />
                </svg>
                <small>最近 {spark.length} 次 · 平均 {Math.round(spark.reduce((a, b) => a + b, 0) / spark.length)} 分</small>
              </div>
            )}

            {isTraining && <button className="stop-button" onClick={stopTraining}>结束本次训练</button>}
            <button className="speak-toggle" onClick={() => setSpeakOn((v) => !v)} aria-pressed={speakOn}>{speakOn ? "🔊 语音开" : "🔈 语音关"}</button>
          </aside>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>从像素到建议，只需三步</h2></div></div>
        <div className="steps">
          <article><b>01</b><span className="step-icon">◉</span><h3>看见动作</h3><p>MediaPipe 在浏览器内定位肩、髋、膝、踝等 33 个人体关键点。</p></article>
          <article><b>02</b><span className="step-icon">∠</span><h3>理解姿态</h3><p>基于关节夹角、左右对称性和动作阶段，识别动作完成度与代偿趋势。</p></article>
          <article><b>03</b><span className="step-icon">↗</span><h3>即时纠正</h3><p>把模型输出翻译成短促、明确、当下就能执行的训练提示。</p></article>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">AIX</span><span>AIxcellentSport</span></div>
        <p>Open-source movement intelligence, built for everyone.</p>
        <small>训练建议仅供一般运动参考，不替代医生或专业康复师的诊断。</small>
      </footer>
    </main>
  );
}
