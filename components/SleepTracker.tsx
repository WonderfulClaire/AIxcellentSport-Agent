"use client";

import { useCallback, useEffect, useState } from "react";

type SleepRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:mm
  wakeTime: string; // HH:mm
  durationHours: number;
  quality: number; // 1-5
  notes: string;
};

const STORAGE_KEY = "aix_sleep_v1";
const QUALITY_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "很差", emoji: "😫" },
  2: { label: "较差", emoji: "😕" },
  3: { label: "一般", emoji: "😐" },
  4: { label: "较好", emoji: "🙂" },
  5: { label: "很好", emoji: "😴" },
};

export default function SleepTracker() {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(4);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  // 加载记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRecords(JSON.parse(saved));
    } catch {}
  }, []);

  // 保存
  const saveRecords = useCallback((next: SleepRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // 计算睡眠时长
  const calcDuration = (bed: string, wake: string): number => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60; // 跨天
    return Math.round(diff / 10) / 10; // 精确到0.1小时
  };

  // 添加记录
  const addRecord = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    // 检查今天是否已有记录
    if (records.some((r) => r.date === today)) {
      // 更新今天的记录
      const updated = records.map((r) =>
        r.date === today
          ? { ...r, bedTime, wakeTime, quality, notes, durationHours: calcDuration(bedTime, wakeTime) }
          : r,
      );
      saveRecords(updated);
    } else {
      const record: SleepRecord = {
        id: `${Date.now()}`,
        date: today,
        bedTime,
        wakeTime,
        quality,
        notes,
        durationHours: calcDuration(bedTime, wakeTime),
      };
      saveRecords([record, ...records]);
    }
    setShowForm(false);
    setNotes("");
  }, [records, bedTime, wakeTime, quality, notes, saveRecords]);

  // 删除记录
  const removeRecord = (id: string) => saveRecords(records.filter((r) => r.id !== id));

  // 统计
  const last7 = records.slice(0, 7).filter((r) => {
    const daysAgo = (Date.now() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const avgDuration = last7.length ? last7.reduce((s, r) => s + r.durationHours, 0) / last7.length : 0;
  const avgQuality = last7.length ? last7.reduce((s, r) => s + r.quality, 0) / last7.length : 0;

  // 推荐睡眠时长（7-9小时为佳）
  const sleepStatus =
    avgDuration >= 7 && avgDuration <= 9 ? "good" :
    avgDuration < 6 ? "bad" : "warn";

  return (
    <div className="sleep-tracker">
      <div className="st-header">
        <h2>😴 睡眠追踪</h2>
        <p>记录睡眠质量，了解恢复状态</p>
      </div>

      {/* 概览卡片 */}
      <div className="st-overview">
        <div className="st-stat-card">
          <span className="st-stat-label">昨晚睡眠</span>
          <strong>{records[0]?.durationHours || "--"}<small>小时</small></strong>
          <span className="st-quality-badge">
            {records[0] ? `${QUALITY_LABELS[records[0].quality].emoji} ${QUALITY_LABELS[records[0].quality].label}` : "未记录"}
          </span>
        </div>
        <div className="st-stat-card">
          <span className="st-stat-label">7日平均</span>
          <strong>{avgDuration.toFixed(1)}<small>小时</small></strong>
          <span className={`st-status-${sleepStatus}`}>
            {sleepStatus === "good" ? "✅ 充足" : sleepStatus === "warn" ? "⚠️ 偏少" : "❌ 不足"}
          </span>
        </div>
        <div className="st-stat-card">
          <span className="st-stat-label">平均质量</span>
          <strong>{avgQuality.toFixed(1)}<small>/5</small></strong>
          <div className="st-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= Math.round(avgQuality) ? "filled" : ""}>★</span>
            ))}
          </div>
        </div>

        {!showForm && (
          <button className="st-add-btn" onClick={() => setShowForm(true)}>
            {records.some((r) => r.date === new Date().toISOString().split("T")[0])
              ? "编辑今晚"
              : "+ 记录今晚"}
          </button>
        )}
      </div>

      {/* 记录表单 */}
      {showForm && (
        <div className="st-form">
          <h3>🌙 记录睡眠</h3>
          <div className="st-form-grid">
            <label>就寝时间
              <input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
            </label>
            <label>起床时间
              <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
            </label>
            <label>睡眠质量 ({quality}/5)
              <input type="range" min="1" max="5" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="st-range" />
              <div className="st-quality-options">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`st-q-btn ${quality === n ? "active" : ""}`}
                    onClick={() => setQuality(n)}
                  >
                    {QUALITY_LABELS[n].emoji} {QUALITY_LABELS[n].label}
                  </button>
                ))}
              </div>
            </label>
            <label>备注（可选）
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="如：做了噩梦、中途醒来…" rows={2} />
            </label>
          </div>
          <div className="st-form-actions">
            <button className="st-save-btn" onClick={addRecord}>保存</button>
            <button className="st-cancel-btn" onClick={() => setShowForm(false)}>取消</button>
          </div>
          <p className="st-preview">
            预计睡眠时长：<strong>{calcDuration(bedTime, wakeTime)} 小时</strong>
            {calcDuration(bedTime, wakeTime) < 6 && <span className="st-warn"> ⚠️ 建议至少睡够6-8小时</span>}
            {calcDuration(bedTime, wakeTime) > 10 && <span className="st-warn"> ⚠️ 睡眠过长可能影响精神状态</span>}
          </p>
        </div>
      )}

      {/* 历史记录 */}
      <div className="st-history">
        <h3>📋 近期记录</h3>
        {records.length === 0 ? (
          <p className="st-empty">还没有睡眠记录，点击上方按钮开始记录</p>
        ) : (
          <div className="st-table">
            <div className="st-row st-head-row">
              <span>日期</span><span>就寝</span><span>起床</span><span>时长</span><span>质量</span><span></span>
            </div>
            {records.map((r) => (
              <div key={r.id} className="st-row">
                <span>{r.date}</span>
                <span>{r.bedTime}</span>
                <span>{r.wakeTime}</span>
                <span>{r.durationHours}h</span>
                <span>{QUALITY_LABELS[r.quality]?.emoji || "?"}{r.quality}/5</span>
                <button onClick={() => removeRecord(r.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 睡眠建议 */}
      <div className="st-tips">
        <h4>💡 睡眠小贴士</h4>
        <ul>
          <li>成年人建议每天 7-9 小时睡眠，运动员可适当增加至 8-10 小时</li>
          <li>睡前 1 小时避免蓝光（手机/电脑），有助于褪黑素分泌</li>
          <li>训练日后保证充足睡眠，肌肉修复主要在深度睡眠中进行</li>
          <li>规律作息：尽量每天同一时间入睡和起床</li>
        </ul>
      </div>
    </div>
  );
}
