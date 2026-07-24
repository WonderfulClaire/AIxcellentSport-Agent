"use client";

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { CoachAgent, AgentMemory, loadAgentConfig, runMultiAgent } from "./agent/index.ts";

// 首屏必需组件同步导入
import LandingPage from "./components/LandingPage";
import Onboarding from "./components/Onboarding";
import MemberHome from "./components/MemberHome";
import AuthModal from "./components/AuthModal";

// 功能组件懒加载
const HealthTrends = lazy(() => import("./components/HealthTrends"));
const WeeklyReport = lazy(() => import("./components/WeeklyReport"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const WearableConnect = lazy(() => import("./components/WearableConnect"));
const VideoAnalyzer = lazy(() => import("./components/VideoAnalyzer"));
const PostureAssessment = lazy(() => import("./components/PostureAssessment"));
const PrivateNutrition = lazy(() => import("./components/PrivateNutrition"));
const DietTracker = lazy(() => import("./components/DietTracker"));
const SleepTracker = lazy(() => import("./components/SleepTracker"));
const TCMWellness = lazy(() => import("./components/TCMWellness"));
const EnergyState = lazy(() => import("./components/EnergyState"));
const HealthConcierge = lazy(() => import("./components/HealthConcierge"));
const ImageConsultant = lazy(() => import("./components/ImageConsultant"));
const WorkoutPlanner = lazy(() => import("./components/WorkoutPlanner"));
const TrainingTimeline = lazy(() => import("./components/TrainingTimeline"));
const ExerciseLibrary = lazy(() => import("./components/ExerciseLibrary"));
const TrainingHistory = lazy(() => import("./components/TrainingHistory"));
const AssistantHub = lazy(() => import("./components/AssistantHub"));
const Settings = lazy(() => import("./components/Settings"));

import { getStoredUser, clearSession } from "./api";

type Exercise = "squat" | "pushup" | "jack" | "lunge" | "plank";
type ModelState = "idle" | "loading" | "ready" | "error";

const EXERCISES: Array<{
  id: Exercise;
  name: string;
  detail: string;
  focus: string;
  regions: string[];
}> = [
  { id: "squat", name: "深蹲", detail: "膝髋轨迹 · 躯干角度", focus: "下肢", regions: ["膝", "腰", "髋"] },
  { id: "pushup", name: "俯卧撑", detail: "肘部角度 · 身体直线", focus: "上肢", regions: ["手腕", "肩", "腰"] },
  { id: "jack", name: "开合跳", detail: "手脚协调 · 动作幅度", focus: "全身", regions: ["膝", "踝"] },
  { id: "lunge", name: "弓步", detail: "前后腿 · 膝盖稳定", focus: "下肢", regions: ["膝", "髋", "踝"] },
  { id: "plank", name: "平板支撑", detail: "躯干直线 · 核心收紧", focus: "核心", regions: ["腰", "肩", "手腕"] },
];

// 可被用户标记为「需要规避」的身体部位（伤病 / 不适）
const INJURY_OPTIONS = ["肩", "膝", "腰", "手腕", "踝", "髋", "颈"];

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
  const [activeTab, setActiveTab] = useState<"assistant" | "member" | "hub" | "train" | "video" | "posture" | "nutrition" | "doctor" | "image" | "plan" | "timeline" | "energy" | "library" | "diet" | "sleep" | "tcm" | "dashboard" | "history" | "wearable" | "trends" | "weekly_report" | "settings">("assistant");
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // PWA 安装：捕获 beforeinstallprompt，提供「添加到主屏幕」按钮
  useEffect(() => {
    const onPrompt = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const promptInstall = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* ignore */ }
    setInstallEvt(null);
  };

  // 启动时恢复登录态
  useEffect(() => {
    setAuthUser(getStoredUser());
    // 首次访问检测：显示引导
    if (!localStorage.getItem("aix_onboarded")) setShowOnboarding(true);
  }, []);

  const openAuth = () => setAuthOpen(true);
  const logout = () => {
    clearSession();
    setAuthUser(null);
    setActiveTab("assistant");
  };
  // 统一入口：评估按钮需要登录态；其余直接跳转
  const handleLaunch = (tab: string) => {
    if (tab === "assess") {
      if (!authUser) setAuthOpen(true);
      else setActiveTab("member");
      return;
    }
    setActiveTab(tab as any);
  };
  const [goals, setGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [spark, setSpark] = useState<number[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const isBlocked = (regions: string[]) => regions.some((r) => injuries.includes(r));
  // 若当前动作因伤病规避被禁用，自动切到安全的动作
  useEffect(() => {
    const cur = EXERCISES.find((e) => e.id === exercise);
    if (cur && isBlocked(cur.regions)) {
      const safe = EXERCISES.find((e) => !isBlocked(e.regions));
      if (safe) selectExercise(safe.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injuries]);
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
      runMultiAgent(metric, { memory: agent.memory, config: { ...agent.config, injuries } })
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
    [speakOn, speak, injuries],
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

      if (exercise === "lunge") {
        // 弓步：双侧膝盖角均值（类似深蹲的上下相位），前后腿通用
        const left = angle(landmarks[23], landmarks[25], landmarks[27]);
        const right = angle(landmarks[24], landmarks[26], landmarks[28]);
        const kneeAngle = (left + right) / 2;
        const kneeGap = Math.abs(landmarks[25].x - landmarks[26].x);
        const ankleGap = Math.abs(landmarks[27].x - landmarks[28].x);
        const valgusPenalty = kneeGap < ankleGap * 0.7 ? 16 : 0;
        const score = Math.round(clamp(100 - Math.abs(170 - kneeAngle) * 0.5 - valgusPenalty));
        setJointAngle(Math.round(kneeAngle));
        setScore(score);
        if (kneeAngle < 105 && phaseRef.current === "up") {
          phaseRef.current = "down";
          setFeedback("后腿膝盖下沉，前膝对准脚尖");
          setFeedbackTone("good");
        } else if (kneeAngle > 160 && phaseRef.current === "down") {
          phaseRef.current = "up";
          repCountRef.current += 1;
          setReps(repCountRef.current);
          triggerAgent({ exercise: "lunge", repIndex: repCountRef.current, score, jointAngle: Math.round(kneeAngle), kneeGap, ankleGap });
        } else if (valgusPenalty) {
          setFeedback("膝盖内扣，主动朝脚尖方向推开");
          setFeedbackTone("warn");
        }
      }

      if (exercise === "plank") {
        // 平板支撑：持续保持，不计数；只看躯干是否成直线
        const bodyLine = angle(landmarks[11], landmarks[23], landmarks[27]);
        const hipLine = angle(landmarks[23], landmarks[25], landmarks[27]);
        const score = Math.round(clamp(100 - Math.abs(175 - bodyLine) * 1.2));
        setJointAngle(Math.round(bodyLine));
        setScore(score);
        if (bodyLine < 160 || hipLine < 150) {
          setFeedback("髋部在塌，收紧核心、肩髋踝成一条线");
          setFeedbackTone("warn");
        } else {
          setFeedback("躯干稳定，保持呼吸均匀");
          setFeedbackTone("good");
        }
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
        if (context && result.landmarks?.length) {
          // 多人时选取画面中最大（离镜头最近）的人，避免误判
          const chosen =
            result.landmarks.length === 1
              ? result.landmarks[0]
              : result.landmarks.reduce((best, lm) => {
                  const xs = lm.map((p) => p.x);
                  const ys = lm.map((p) => p.y);
                  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
                  return area > best.area ? { lm, area } : best;
                }, { lm: result.landmarks[0], area: -1 }).lm;
          const drawing = new DrawingUtils(context);
          drawing.drawConnectors(chosen, PoseLandmarker.POSE_CONNECTIONS, {
            color: "#D4AF37",
            lineWidth: 4,
          });
          drawing.drawLandmarks(chosen, {
            color: "#F4D27A",
            fillColor: "#0A0A0B",
            lineWidth: 2,
            radius: 4,
          });
          if (result.landmarks.length > 1) {
            setFeedback(`检测到 ${result.landmarks.length} 人，已锁定最大目标`);
          }
          analyzePose(chosen);
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
          numPoses: 4,
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
    <main className="app-shell" onClick={() => menuOpen && setMenuOpen(false)}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AIxcellentHealth 首页" onClick={(e) => { e.preventDefault(); setActiveTab("assistant"); }}>
          <span className="brand-mark">✦</span>
          <span className="brand-name">AIxcellent<em className="brand-sub">私享管家</em></span>
        </a>

        {/* 分类功能菜单 */}
        <div className={`nav-menu-wrap ${menuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <button className="nav-menu-trigger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="功能菜单">
            <span className="menu-icon-bars"><i /><i /><i /></span>
            <span>功能中心</span>
            <svg className="menu-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {menuOpen && (
            <div className="nav-dropdown">
              <div className="dropdown-group">
                <span className="group-label">运动训练</span>
                {[
                  { key: "train" as const, label: "实时教练", desc: "摄像头实时姿态纠正" },
                  { key: "video" as const, label: "视频分析", desc: "上传视频逐帧诊断" },
                  { key: "posture" as const, label: "体态评估", desc: "全身姿态扫描" },
                  { key: "plan" as const, label: "训练计划", desc: "智能生成训练方案" },
                  { key: "library" as const, label: "动作库", desc: "200+ 标准动作" },
                ].map((item) => (
                  <button key={item.key} className="dropdown-item" onClick={() => { setActiveTab(item.key); setMenuOpen(false); }}>
                    <span className="item-label">{item.label}</span><span className="item-desc">{item.desc}</span>
                  </button>
                ))}
              </div>
              <div className="dropdown-group">
                <span className="group-label">健康管理</span>
                {[
                  { key: "nutrition" as const, label: "私人营养", desc: "定制营养方案" },
                  { key: "diet" as const, label: "饮食追踪", desc: "卡路里与营养记录" },
                  { key: "sleep" as const, label: "睡眠监控", desc: "睡眠质量分析" },
                  { key: "wearable" as const, label: "可穿戴设备", desc: "实时心率·手表联动" },
                  { key: "tcm" as const, label: "中医养生", desc: "节气·体质·穴位" },
                  { key: "energy" as const, label: "能量状态", desc: "精力管理建议" },
                  { key: "trends" as const, label: "健康趋势", desc: "多维度数据可视化" },
                  { key: "weekly_report" as const, label: "每周报告", desc: "本周健康数据汇总" },
                  { key: "doctor" as const, label: "健康咨询", desc: "就医准备支持" },
                ].map((item) => (
                  <button key={item.key} className="dropdown-item" onClick={() => { setActiveTab(item.key); setMenuOpen(false); }}>
                    <span className="item-label">{item.label}</span><span className="item-desc">{item.desc}</span>
                  </button>
                ))}
              </div>
              <div className="dropdown-group">
                <span className="group-label">形象 & 数据</span>
                {authUser && (
                  <button className="dropdown-item" onClick={() => { setActiveTab("member"); setMenuOpen(false); }}>
                    <span className="item-label">会员中心</span><span className="item-desc">今日状态与档案</span>
                  </button>
                )}
                {[
                  { key: "hub" as const, label: "管家对话", desc: "你的私人健康管家" },
                  { key: "image" as const, label: "形象管理", desc: "私人穿搭顾问" },
                  { key: "timeline" as const, label: "时间轴", desc: "健康历程回顾" },
                  { key: "dashboard" as const, label: "数据面板", desc: "全景数据看板" },
                  { key: "history" as const, label: "训练记录", desc: "历史训练档案" },
                  { key: "settings" as const, label: "全局设置", desc: "智能对话配置与偏好" },
                ].map((item) => (
                  <button key={item.key} className="dropdown-item" onClick={() => { setActiveTab(item.key); setMenuOpen(false); }}>
                    <span className="item-label">{item.label}</span><span className="item-desc">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav aria-label="外部链接">
          <button className="top-link" onClick={() => { localStorage.removeItem("aix_onboarded"); setShowOnboarding(true); setMenuOpen(false); }} title="重新查看产品引导">重新看引导</button>
          {installEvt && !installed && (
            <button className="top-link install-btn" onClick={promptInstall} title="添加到主屏幕，像 App 一样使用">⤓ 安装到手机</button>
          )}
          <a href="https://github.com/WonderfulClaire/AIxcellentHealth" target="_blank" rel="noreferrer" className="top-link">GitHub ↗</a>
          {authUser ? (
            <button className="top-link" onClick={logout}>退出 {authUser.name || ""}</button>
          ) : (
            <button className="top-link auth-trigger" onClick={openAuth}>登录 / 注册</button>
          )}
        </nav>
        <span className="privacy-pill"><i /> 隐私优先</span>
      </header>

      {activeTab === "assistant" && (
        <div key="assistant" className="page-fade-in">
          {authUser ? (
            <MemberHome user={authUser} onLaunch={handleLaunch} onLogout={logout} />
          ) : (
            <LandingPage onLaunch={handleLaunch} />
          )}
        </div>
      )}

      {activeTab === "member" && authUser && (
        <div key="member" className="page-fade-in">
          <MemberHome user={authUser} onLaunch={handleLaunch} onLogout={logout} />
        </div>
      )}

      <Suspense fallback={<div style={{color:'#D4AF37',textAlign:'center',padding:'3rem'}}>加载中...</div>}>
      {activeTab === "hub" && <div key="hub" className="page-fade-in"><AssistantHub onLaunch={handleLaunch} /></div>}
      </Suspense>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={(u) => { setAuthUser(u); setAuthOpen(false); setActiveTab("member"); }} />

      {activeTab === "train" && (<>
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">专为你 · 私人订制健康管家</span>
          <h1>练得更准。<br />活得更<span style={{ color: "var(--acid)" }}>健康</span>。</h1>
          <p>实时姿态识别 · 视频动作分析 · 饮食营养追踪 · 睡眠质量监控 · 中医节气养生 —— 全方位健康管理，数据不出设备。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={startTraining} disabled={modelState === "loading" || isTraining}>
              {modelState === "loading" ? "正在启动…" : isTraining ? "训练进行中" : "开启实时教练"}
              <span>→</span>
            </button>
            <a className="text-link" href="#how">了解它如何工作</a>
          </div>
          <div className="trust-row">
            <span><b>33</b> 关键点</span>
            <span><b>&lt;50ms</b> 本地推理</span>
            <span><b>7</b> 大模块</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="健康管家示意">
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
          <div className="float-card card-score"><small>综合评分</small><strong>92</strong><span>/ 100</span></div>
          <div className="float-card card-status"><i /> 健康良好</div>
          <div className="angle-chip">今日目标 ✅</div>
        </div>
      </section>

      <section className="coach-section" id="coach">
        <div className="section-heading">
          <div><span className="eyebrow">LIVE MOTION LAB</span><h2>实时动作实验室</h2></div>
          <p>选择动作，打开摄像头。所有视频帧只在你的设备上处理。</p>
        </div>

        <div className="injury-bar" role="group" aria-label="需要规避的部位">
          <span className="injury-label">🩹 规避部位</span>
          {INJURY_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`injury-chip ${injuries.includes(opt) ? "on" : ""}`}
              aria-pressed={injuries.includes(opt)}
              onClick={() => setInjuries((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]))}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="exercise-tabs" role="tablist" aria-label="选择训练动作">
          {EXERCISES.map((item) => {
            const blocked = isBlocked(item.regions);
            return (
              <button
                key={item.id}
                className={`${exercise === item.id ? "active" : ""} ${blocked ? "blocked" : ""}`}
                disabled={blocked}
                onClick={() => !blocked && selectExercise(item.id)}
                role="tab"
                aria-selected={exercise === item.id}
                title={blocked ? "该动作会刺激你标记规避的部位" : undefined}
              >
                <span>{item.name}</span><small>{item.detail}</small><b>{item.focus}</b>
                {blocked && <em className="blocked-tag">规避</em>}
              </button>
            );
          })}
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
              <div><small>COACH</small><p>{feedback}</p></div>
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {agentFocus && (
              <div className="agent-focus">
                <span>✦ 管家重点</span>
                <strong>{agentFocus}</strong>
              </div>
            )}
            {report && (
              <div className="report-card">
                <span className="report-title">✦ 训练报告</span>
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
        <div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>七大模块，全方位守护</h2></div></div>
        <div className="steps">
          <article><b>01</b><span className="step-icon">🎯</span><h3>实时训练</h3><p>MediaPipe 浏览器端实时姿态识别，33 关键点逐帧追踪，即时纠正动作。</p></article>
          <article><b>02</b><span className="step-icon">🎬</span><h3>视频分析</h3><p>上传健身视频，智能逐帧分析姿态，生成专业改进报告。</p></article>
          <article><b>03</b><span className="step-icon">📚</span><h3>动作库</h3><p>200+ 动作数据库，含中文说明、肌群映射、难度分级，支持搜索筛选。</p></article>
          <article><b>04</b><span className="step-icon">🥗</span><h3>饮食管理</h3><p>中文食物营养库，卡路里/蛋白质/碳水/脂肪追踪，每日目标设定。</p></article>
          <article><b>05</b><span className="step-icon">😴</span><h3>睡眠追踪</h3><p>记录睡眠时长与质量，7 日趋势分析，科学恢复建议。</p></article>
          <article><b>06</b><span className="step-icon">🌿</span><h3>中医养生</h3><p>二十四节气 + 天气联动 + 体质辨识 + 穴位保健，个性化养生方案。</p></article>
          <article><b>07</b><span className="step-icon">✦</span><h3>智能引擎</h3><p>多模块编排（感知→记忆→规划→反馈），隐私优先，数据不出设备。</p></article>
        </div>
      </section>
      </>)}

      <Suspense fallback={<div style={{color:'#D4AF37',textAlign:'center',padding:'3rem'}}>加载中...</div>}>
      {activeTab === "video" && <div key="video" className="page-fade-in"><VideoAnalyzer /></div>}
      {activeTab === "posture" && <div key="posture" className="page-fade-in"><PostureAssessment /></div>}
      {activeTab === "nutrition" && <div key="nutrition" className="page-fade-in"><PrivateNutrition /></div>}
      {activeTab === "doctor" && <div key="doctor" className="page-fade-in"><HealthConcierge /></div>}
      {activeTab === "image" && <div key="image" className="page-fade-in"><ImageConsultant /></div>}
      {activeTab === "plan" && <div key="plan" className="page-fade-in"><WorkoutPlanner /></div>}
      {activeTab === "timeline" && <div key="timeline" className="page-fade-in"><TrainingTimeline /></div>}
      {activeTab === "energy" && <div key="energy" className="page-fade-in"><EnergyState /></div>}
      {activeTab === "diet" && <div key="diet" className="page-fade-in"><DietTracker /></div>}
      {activeTab === "sleep" && <div key="sleep" className="page-fade-in"><SleepTracker /></div>}
      {activeTab === "tcm" && <div key="tcm" className="page-fade-in"><TCMWellness /></div>}
      {activeTab === "library" && <div key="library" className="page-fade-in"><ExerciseLibrary /></div>}
      {activeTab === "dashboard" && <div key="dashboard" className="page-fade-in"><Dashboard /></div>}
      {activeTab === "history" && <div key="history" className="page-fade-in"><TrainingHistory /></div>}
      {activeTab === "wearable" && <div key="wearable" className="page-fade-in"><WearableConnect /></div>}
      {activeTab === "trends" && <div key="trends" className="page-fade-in"><HealthTrends /></div>}
      {activeTab === "weekly_report" && <div key="weekly_report" className="page-fade-in"><WeeklyReport /></div>}
      {activeTab === "settings" && <div key="settings" className="page-fade-in"><Settings /></div>}
      </Suspense>

      <footer>
        <div className="brand"><span className="brand-mark">✦</span><span>AIxcellent 私享管家</span></div>
        <p>私人健康管家 —— 运动 · 饮食 · 睡眠 · 养生，全方位守护</p>
        <small className="compliance-note">本健康方案仅作日常养护参考，身体疾病请前往正规医疗机构就诊。</small>
        <small>中医养生内容基于传统理论，个体差异请咨询专业医师；本产品不涉及处方药与诊疗。</small>
      </footer>

      {/* 移动端底部导航 */}
      <nav className="mobile-tabbar" aria-label="移动端导航">
        {([
          { k: "assistant", label: "首页", icon: "M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9" },
          { k: "hub", label: "管家", icon: "M12 3l2.4 5.6L20 9.3l-4 4 1 6-5-2.8L7 19.3l1-6-4-4 5.6-.7z" },
          { k: "wearable", label: "穿戴", icon: "M4 12h3l2-5 3 10 2-6 2 3h4" },
          { k: "train", label: "训练", icon: "M6 8v8M18 8v8M3 12h3M18 12h3M9 12h6M8 10v4M16 10v4" },
          { k: "me", label: "我的", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" },
        ] as const).map((t) => {
          const active =
            (t.k === "me" && activeTab === "member") ||
            (t.k !== "me" && activeTab === t.k);
          const go = () => {
            if (t.k === "me") { authUser ? setActiveTab("member") : openAuth(); }
            else setActiveTab(t.k as any);
            setMenuOpen(false);
          };
          return (
            <button key={t.k} className={`tabbar-item ${active ? "active" : ""}`} onClick={go}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {showOnboarding && <Onboarding onComplete={() => { localStorage.setItem("aix_onboarded", "true"); setShowOnboarding(false); }} />}
    </main>
  );
}
