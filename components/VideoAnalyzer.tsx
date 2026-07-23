"use client";

import { useCallback, useRef, useState } from "react";
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import { extractFramePoses, analyzeTimeSeries, generateVideoReport } from "../agent/videoAnalyzer.js";
import { loadAgentConfig } from "../agent/index.js";

type AnalysisReport = {
  exerciseName: string;
  overallScore: number;
  summary: string;
  sections: Array<{ title: string; content: string }>;
  keyTips: string[];
  riskWarnings: string[];
};

export default function VideoAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const [status, setStatus] = useState<"idle" | "loading-model" | "ready" | "analyzing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [keyframes, setKeyframes] = useState<Array<{ time: number; image: string }>>([]);
  const [userNotes, setUserNotes] = useState("");
  const [error, setError] = useState("");

  // 初始化 MediaPipe（IMAGE 模式，用于逐帧分析）
  const initModel = useCallback(async () => {
    setStatus("loading-model");
    setError("");
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 2,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
      });
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setError("模型加载失败，请检查网络后重试");
    }
  }, []);

  // 处理文件选择
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        setError("请上传视频文件（mp4 / mov / webm）");
        return;
      }
      if (file.size > 200 * 1024 * 1024) {
        setError("文件过大，请控制在 200MB 以内");
        return;
      }
      setFileName(file.name);
      setReport(null);
      setKeyframes([]);
      setProgress(0);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      // 自动初始化模型并开始分析
      if (!landmarkerRef.current) {
        initModel().then(() => {
          // initModel 完成后会 setStatus('ready')，需要等一下再分析
          setTimeout(() => startAnalysis(file, url), 500);
        });
      } else {
        startAnalysis(file, url);
      }
    },
    [initModel],
  );

  // 开始分析
  const startAnalysis = useCallback(async (file: File, url: string) => {
    if (!videoRef.current || !landmarkerRef.current) return;

    setStatus("analyzing");
    setProgress(0);
    setError("");

    const video = videoRef.current;
    video.src = url;
    await video.play().catch(() => {}); // 部分浏览器需要用户交互才能播放
    video.pause(); // 我们只需要 seek，不需要播放

    try {
      // 1. 逐帧提取姿态数据
      const frames = await extractFramePoses(video, landmarkerRef.current, canvasRef.current, {
        onProgress: (pct) => setProgress(pct),
        maxFrames: 120,
        sampleInterval: 6,
      });

      if (frames.length < 5) {
        setStatus("error");
        setError("未能从视频中提取到足够的姿态数据。请确保：人物全身入镜、光线充足、动作清晰可见");
        URL.revokeObjectURL(url);
        return;
      }

      // 2. 时序分析
      setProgress(70);
      const analysis = analyzeTimeSeries(frames);

      if (analysis.error) {
        setStatus("error");
        setError(analysis.error);
        URL.revokeObjectURL(url);
        return;
      }

      // 3. LLM 生成报告
      setProgress(85);
      const config = loadAgentConfig();
      const reportData = await generateVideoReport({ ...analysis, userNotes }, config);

      setProgress(100);
      setReport(reportData as AnalysisReport);
      setKeyframes(analysis.keyframes || []);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setError(`分析过程出错：${e instanceof Error ? e.message : "未知错误"}`);
    }
  }, []);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // 当前显示的状态内容
  const renderContent = () => {
    switch (status) {
      case "idle":
        return (
          <div className="va-upload-zone" onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className="va-upload-icon">🎬</div>
            <h3>上传健身视频</h3>
            <p>支持 mp4 / mov / webb，最大 200MB</p>
            <p className="va-hint">AI 将逐帧分析你的动作姿态，给出专业改进建议</p>
            <button
              className="va-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              选择视频文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="va-features">
              <span>🔒 视频不离开设备</span>
              <span>📊 33关键点逐帧</span>
              <span>🤖 AI专业报告</span>
            </div>
          </div>
        );

      case "loading-model":
        return (
          <div className="va-status">
            <div className="va-spinner" />
            <p>正在加载姿态识别模型…</p>
            <small>首次加载约需 3-5 秒</small>
          </div>
        );

      case "ready":
      case "analyzing": {
        const pct = status === "analyzing" ? progress : 0;
        return (
          <div className="va-analyzing">
            <video ref={videoRef} playsInline muted className="va-preview-video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="va-progress-overlay">
              <div className="va-spinner" />
              <p>{status === "analyzing" ? `正在分析中… ${pct}%` : "准备就绪"}</p>
              {status === "analyzing" && (
                <div className="va-progress-bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
              <small>{fileName}</small>
            </div>
          </div>
        );
      }

      case "done":
        return (
          <div className="va-result">
            {/* 左侧：预览 + 关键帧 */}
            <div className="va-result-left">
              <div className="va-video-preview">
                <video ref={videoRef} src={videoUrl || undefined} controls playsInline />
              </div>
              {keyframes.length > 0 && (
                <div className="va-keyframes">
                  <h4>📸 关键帧截图</h4>
                  <div className="va-keyframe-grid">
                    {keyframes.slice(0, 6).map((kf, i) => (
                      <div key={i} className="va-keyframe-item">
                        <img src={kf.image} alt={`关键帧 ${(kf.time / 1000).toFixed(1)}s`} />
                        <span>{(kf.time / 1000).toFixed(1)}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：报告 */}
            <div className="va-report">
              <div className="va-report-header">
                <div className="va-score-circle">
                  <strong>{report?.overallScore}</strong>
                  <span>/100</span>
                </div>
                <div className="va-report-meta">
                  <h3>{report?.exerciseName}</h3>
                  <p>{report?.summary}</p>
                </div>
              </div>

              {/* 安全警告 */}
              {report?.riskWarnings && report.riskWarnings.length > 0 && (
                <div className="va-risk-warnings">
                  <span>⚠️ 注意</span>
                  {report.riskWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              {/* 四段式分析 */}
              {report?.sections?.map((section, i) => (
                <div key={i} className="va-section">
                  <h4>
                    <span className="va-section-num">{i + 1}</span>
                    {section.title}
                  </h4>
                  <div className="va-section-content">{section.content.split("\n").map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}</div>
                </div>
              ))}

              {/* 快速提示 */}
              {report?.keyTips && (
                <div className="va-tips">
                  <h4>💡 快速提示</h4>
                  <ul>
                    {report.keyTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="va-actions">
                <button className="va-retry-btn" onClick={() => { setStatus("idle"); setReport(null); setVideoUrl(null); }}>
                  分析新视频
                </button>
              </div>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="va-error">
            <span>⚠️</span>
            <p>{error || "分析失败，请重试"}</p>
            <button onClick={() => { setStatus("idle"); setError(""); }}>重新上传</button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="video-analyzer">
      <div className="va-header">
        <h2>🎬 视频动作分析</h2>
        <p>上传你的健身视频，AI 逐帧分析姿态，给出专业改进建议（对标 Gemini 级别）</p>
      </div>

      {/* 用户备注输入 */}
      {(status === "idle") && (
        <div className="va-notes-input">
          <label>可选：描述你想让 AI 关注什么（如"帮我看看深蹲膝盖内扣"、"俯卧撑塌腰问题"）</label>
          <textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="例如：这是我在做的臀推变体，想看看臀部是否真正发力..."
            rows={2}
          />
        </div>
      )}

      {renderContent()}
    </div>
  );
}
