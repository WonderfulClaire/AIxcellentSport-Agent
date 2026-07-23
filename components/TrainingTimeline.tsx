"use client";

import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════
// 训练时间轴 — 甘特图式可视化（对标截图1）
// ═══════════════════════════════════════════════════

interface TimelineEvent {
  type: string;
  name: string;
  exerciseName?: string;
  setNumber?: number;
  start: number;
  end: number;
  color: string;
  category: string;
  reps?: string;
}

export default function TrainingTimeline({ events: propEvents, mode = "display" }: {
  events?: TimelineEvent[];
  mode?: "display" | "live" | "replay";
}) {
  const [events, setEvents] = useState<TimelineEvent[]>(propEvents || []);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 如果没有传入事件，生成示例数据
  useEffect(() => {
    if (!propEvents && events.length === 0) {
      generateDemoEvents();
    }
  }, [propEvents]);

  // 实时模式：更新当前时间
  useEffect(() => {
    if (mode !== "live") return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  // 生成演示数据
  async function generateDemoEvents() {
    try {
      const { generateTimeline } = await import("../agent/workoutPlanner");
      const demoExercises = [
        { name: "保加利亚深蹲", sets: 4, reps: "8-15", target: ["臀部", "大腿"] },
        { name: "标准俯卧撑", sets: 3, reps: "8-12", target: ["胸部", "三头"] },
        { name: "Pike俯卧撑", sets: 3, reps: "8-15", target: ["肩部"] },
        { name: "臀桥", sets: 3, reps: "12-18", target: ["臀部"] },
      ];
      const demo = generateTimeline(demoExercises, { startTime: Date.now() - 15 * 60 * 1000 });
      setEvents(demo);
    } catch {
      // 静态兜底
      setEvents(getStaticDemoEvents());
    }
  }

  // 计算总时长
  const totalDuration = events.length > 0
    ? Math.max(...events.map(e => e.end)) - Math.min(...events.map(e => e.start))
    : 0;

  const startTime = events.length > 0 ? Math.min(...events.map(e => e.start)) : 0;

  // 格式化时间
  function formatTime(ms: number) {
    const seconds = Math.floor((ms - startTime) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // 格式化持续时间
  function formatDuration(ms: number) {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}秒`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
  }

  // 统计
  const stats = useMemo(() => {
    let trainingTime = 0, restTime = 0, warmupTime = 0, stretchTime = 0;
    events.forEach(e => {
      const dur = e.end - e.start;
      if (e.type === "warmup") warmupTime += dur;
      else if (e.type === "stretch") stretchTime += dur;
      else if (e.type === "set") trainingTime += dur;
      else restTime += dur;
    });
    return {
      total: formatDuration(totalDuration),
      effective: formatDuration(trainingTime + warmupTime + stretchTime),
      rest: formatDuration(restTime),
      setCount: events.filter(e => e.type === "set").length,
      exerciseNames: [...new Set(events.filter(e => e.type === "set").map(e => e.exerciseName || e.name))],
    };
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="tl-container">
        <div className="tl-header">
          <h2>⏱️ 训练时间轴</h2>
          <p>甘特图式可视化你的训练过程</p>
        </div>
        <div className="tl-empty">
          <p>完成一次训练或上传视频后，这里会显示训练时间轴。</p>
          <button className="tl-demo-btn" onClick={generateDemoEvents}>查看演示</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tl-container" ref={containerRef}>
      {/* 头部 */}
      <div className="tl-header">
        <h2>⏱️ 训练时间轴</h2>
        <p>可视化每个动作的执行时间和顺序</p>
      </div>

      {/* 统计条（对标截图1顶部） */}
      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-val">{stats.total}</span>
          <span className="tl-stat-label">总时长</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-val">{stats.effective}</span>
          <span className="tl-stat-label">有效训练</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-val">{stats.setCount}</span>
          <span className="tl-stat-label">总组数</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-val">{stats.exerciseNames.length}</span>
          <span className="tl-stat-label">不同动作</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-val">{stats.rest}</span>
          <span className="tl-stat-label">休息时间</span>
        </div>
      </div>

      {/* 时间轴主体 */}
      <div className="tl-timeline">
        {/* 时间刻度 */}
        <div className="tl-ruler">
          {Array.from({ length: Math.ceil(totalDuration / 60000) + 1 }).map((_, i) => {
            const t = startTime + i * 60000;
            return (
              <span key={i} className="tl-ruler-mark" style={{ left: `${(i * 60000 / totalDuration) * 100}%` }}>
                {formatTime(t)}
              </span>
            );
          })}
        </div>

        {/* 事件条 */}
        <div className="tl-tracks">
          {events.map((event, idx) => {
            const leftPercent = ((event.start - startTime) / totalDuration) * 100;
            const widthPercent = ((event.end - event.start) / totalDuration) * 100;
            const isHovered = hoveredEvent === event;

            return (
              <div
                key={idx}
                className={`tl-bar tl-bar-${event.type}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 1.5)}%`,
                  backgroundColor: event.color,
                }}
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {/* 条内文字（足够宽时显示） */}
                {widthPercent > 5 && (
                  <span className="tl-bar-text">{event.name}</span>
                )}

                {/* 悬浮详情卡片 */}
                {isHovered && (
                  <div className="tl-tooltip">
                    <strong>{event.name}</strong>
                    {event.exerciseName && <span className="tl-tip-ex">{event.exerciseName}</span>}
                    {event.setNumber && <span>第{event.setNumber}组</span>}
                    <div className="tl-tip-row">
                      <span>🕐 {formatTime(event.start)} – {formatTime(event.end)}</span>
                      <span>⏱️ {formatDuration(event.end - event.start)}</span>
                    </div>
                    {event.reps && <span>📊 {event.reps}</span>}
                    <span className="tl-tip-cat">{event.category}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 实时进度线 */}
          {(mode === "live") && (
            <div
              className="tl-progress-line"
              style={{ left: `${((currentTime - startTime) / totalDuration) * 100}%` }}
            />
          )}
        </div>

        {/* 图例 */}
        <div className="tl-legend">
          <span className="tl-legend-item"><i style={{ background: "#55c8ff" }} /> 热身</span>
          <span className="tl-legend-item"><i style={{ background: "#6bbd00" }} /> 正式组</span>
          <span className="tl-legend-item"><i style={{ background: "#f59e0b" }} /> 辅助</span>
          <span className="tl-legend-item"><i style={{ background: "#ec4899" }} /> 拉伸</span>
        </div>
      </div>

      {/* 动作与组次汇总（对标截图1左侧） */}
      <div className="tl-summary-section">
        <h4>📋 动作与组次汇总</h4>
        <div className="tl-summary-grid">
          {stats.exerciseNames.map((name, idx) => {
            const setsForExercise = events.filter(
              e => e.type === "set" && (e.exerciseName === name || e.name.includes(name))
            );
            return (
              <div key={idx} className="tl-summary-card">
                <h5>{name}</h5>
                <span className="tl-summary-count">{setsForExercise.length}</span>
                <span className="tl-summary-unit">组</span>
                <div className="tl-summary-detail">
                  {setsForExercise.map((s, si) => (
                    <span key={si} className="tl-set-chip" style={{ backgroundColor: s.color }}>
                      第{s.setNumber}组 · {s.reps}
                    </span>
                  ))}
                </div>
                <div className="tl-summary-actions">
                  <button className="wp-action-btn small">本地图文</button>
                  <button className="wp-action-btn primary small">卡片内嵌版</button>
                  <button className="wp-action-btn small">新标签打开</button>
                  <button className="wp-action-btn small">更多视频</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 静态兜底演示数据
function getStaticDemoEvents(): TimelineEvent[] {
  const base = Date.now() - 20 * 60 * 1000; // 20分钟前开始
  return [
    { type: "warmup", name: "热身", start: base, end: base + 5 * 60 * 1000, color: "#55c8ff", category: "准备" },
    { type: "set", name: "保加利亚深蹲 第1组", exerciseName: "保加利亚深蹲", setNumber: 1, start: base + 5.5 * 60 * 1000, end: base + 6.5 * 60 * 1000, color: "#6bbd00", category: "下肢", reps: "12" },
    { type: "set", name: "保加利亚深蹲 第2组", exerciseName: "保加利亚深蹲", setNumber: 2, start: base + 7.3 * 60 * 1000, end: base + 8.3 * 60 * 1000, color: "#6bbd00", category: "下肢", reps: "10" },
    { type: "set", name: "保加利亚深蹲 第3组", exerciseName: "保加利亚深蹲", setNumber: 3, start: base + 9.1 * 60 * 1000, end: base + 10.1 * 60 * 1000, color: "#6bbd00", category: "下肢", reps: "10" },
    { type: "set", name: "保加利亚深蹲 第4组", exerciseName: "保加利亚深蹲", setNumber: 4, start: base + 10.9 * 60 * 1000, end: base + 11.9 * 60 * 1000, color: "#6bbd00", category: "下肢", reps: "8" },
    { type: "set", name: "标准俯卧撑 第1组", exerciseName: "标准俯卧撑", setNumber: 1, start: base + 12.7 * 60 * 1000, end: base + 13.4 * 60 * 1000, color: "#f59e0b", category: "上肢推", reps: "10" },
    { type: "set", name: "标准俯卧撑 第2组", exerciseName: "标准俯卧撑", setNumber: 2, start: base + 14.2 * 60 * 1000, end: base + 14.9 * 60 * 1000, color: "#f59e0b", category: "上肢推", reps: "8" },
    { type: "set", name: "标准俯卧撑 第3组", exerciseName: "标准俯卧撑", setNumber: 3, start: base + 15.7 * 60 * 1000, end: base + 16.4 * 60 * 1000, color: "#f59e0b", category: "上肢推", reps: "7" },
    { type: "set", name: "Pike俯卧撑 第1组", exerciseName: "Pike俯卧撑", setNumber: 1, start: base + 17.2 * 60 * 1000, end: base + 18 * 60 * 1000, color: "#8b5cf6", category: "肩部", reps: "12" },
    { type: "stretch", name: "拉伸放松", start: base + 18.5 * 60 * 1000, end: base + 20 * 60 * 1000, color: "#ec4899", category: "恢复" },
  ];
}
