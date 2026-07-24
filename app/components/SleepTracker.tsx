"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import ModuleIntro from "./ModuleIntro";

type SleepRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:mm
  wakeTime: string; // HH:mm
  durationHours: number;
  quality: number; // 1-5
  notes: string;
};

type SleepAnalysis = {
  avgDuration: number;
  regularity: { stdMin: number; rating: string; stars: number };
  socialJetLag: { diffMin: number; description: string };
  trend: { change: number; direction: string };
  interpretations: string[];
};

const STORAGE_KEY = "aix_sleep_v1";
const QUALITY_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "很差", emoji: "😫" },
  2: { label: "较差", emoji: "😕" },
  3: { label: "一般", emoji: "😐" },
  4: { label: "较好", emoji: "🙂" },
  5: { label: "很好", emoji: "😴" },
};

/** Convert HH:mm bedTime to minutes since midnight (handling cross-day) */
function bedTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  if (h < 6) return mins + 24 * 60; // e.g., 01:30 → 25.5h = 1530 min
  return mins;
}

/** Calculate standard deviation of an array of numbers */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** Get day of week (1=Mon...7=Sun) from YYYY-MM-DD */
function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/** Analyze sleep records */
function analyzeSleep(records: SleepRecord[]): SleepAnalysis | null {
  if (records.length < 2) return null;

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const now = Date.now();

  const last14 = sorted.filter((r) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 14;
  });
  const last7 = last14.filter((r) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const prev7 = last14.filter((r) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo > 7 && daysAgo <= 14;
  });

  const effectiveRecords = last14.length >= 3 ? last14 : sorted.slice(0, 7);

  // 1. Average duration
  const durationSet = last7.length >= 2 ? last7 : effectiveRecords;
  const avgDuration = durationSet.reduce((s, r) => s + r.durationHours, 0) / durationSet.length;

  // 2. Regularity: std deviation of bedtimes
  const bedMins = effectiveRecords.map((r) => bedTimeToMinutes(r.bedTime));
  const stdMinutes = stdDev(bedMins);
  let regularityRating = "很规律";
  let stars = 3;
  if (stdMinutes > 60) { regularityRating = "不规律"; stars = 1; }
  else if (stdMinutes > 30) { regularityRating = "一般"; stars = 2; }

  // 3. Social jet lag
  const weekdayBeds = effectiveRecords.filter((r) => getDayOfWeek(r.date) <= 5).map((r) => bedTimeToMinutes(r.bedTime));
  const weekendBeds = effectiveRecords.filter((r) => getDayOfWeek(r.date) > 5).map((r) => bedTimeToMinutes(r.bedTime));

  let socialJetLagMin = 0;
  let socialJetLagDesc = "数据不足";
  if (weekdayBeds.length > 0 && weekendBeds.length > 0) {
    const avgWeekday = weekdayBeds.reduce((a, b) => a + b, 0) / weekdayBeds.length;
    const avgWeekend = weekendBeds.reduce((a, b) => a + b, 0) / weekendBeds.length;
    socialJetLagMin = Math.round(avgWeekend - avgWeekday);
    if (Math.abs(socialJetLagMin) < 15) {
      socialJetLagDesc = "周末与工作日作息一致，很好";
    } else if (socialJetLagMin > 0) {
      socialJetLagDesc = `周末比工作日晚睡约 ${(socialJetLagMin / 60).toFixed(1)} 小时`;
    } else {
      socialJetLagDesc = `周末比工作日早睡约 ${(Math.abs(socialJetLagMin) / 60).toFixed(1)} 小时`;
    }
  }

  // 4. Trend
  let trendChange = 0;
  let trendDirection = "数据不足";
  if (last7.length >= 2 && prev7.length >= 2) {
    const avgLast = last7.reduce((s, r) => s + r.durationHours, 0) / last7.length;
    const avgPrev = prev7.reduce((s, r) => s + r.durationHours, 0) / prev7.length;
    trendChange = Math.round((avgLast - avgPrev) * 10) / 10;
    if (Math.abs(trendChange) < 0.1) trendDirection = "持平";
    else if (trendChange > 0) trendDirection = "增加";
    else trendDirection = "减少";
  }

  // 5. Interpretations
  const interpretations: string[] = [];
  if (avgDuration >= 7 && avgDuration <= 9) {
    interpretations.push(`本周平均睡眠 ${avgDuration.toFixed(1)} 小时，质量良好`);
  } else if (avgDuration < 7) {
    interpretations.push(`本周平均睡眠 ${avgDuration.toFixed(1)} 小时，建议增加至 7-9 小时`);
  } else {
    interpretations.push(`本周平均睡眠 ${avgDuration.toFixed(1)} 小时，偏长，注意睡眠效率`);
  }
  interpretations.push(`入睡时间规律性${regularityRating}（标准差 ${Math.round(stdMinutes)} 分钟）`);
  if (weekdayBeds.length > 0 && weekendBeds.length > 0 && Math.abs(socialJetLagMin) >= 15) {
    interpretations.push(socialJetLagMin > 60 ? `${socialJetLagDesc}，建议缩小差距` : socialJetLagDesc);
  }
  if (trendDirection !== "数据不足") {
    if (trendChange > 0) interpretations.push(`睡眠时长较上周增加 ${trendChange} 小时，保持向好趋势`);
    else if (trendChange < 0) interpretations.push(`睡眠时长较上周减少 ${Math.abs(trendChange)} 小时，注意休息`);
    else interpretations.push("睡眠时长与上周持平，保持稳定");
  }

  return {
    avgDuration,
    regularity: { stdMin: Math.round(stdMinutes), rating: regularityRating, stars },
    socialJetLag: { diffMin: socialJetLagMin, description: socialJetLagDesc },
    trend: { change: trendChange, direction: trendDirection },
    interpretations,
  };
}

export default function SleepTracker() {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(4);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRecords(JSON.parse(saved));
    } catch {}
  }, []);

  const saveRecords = useCallback((next: SleepRecord[]) => {
    setRecords(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const calcDuration = (bed: string, wake: string): number => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60;
    return Math.round(diff / 10) / 10;
  };

  const addRecord = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    if (records.some((r) => r.date === today)) {
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

  const removeRecord = (id: string) => saveRecords(records.filter((r) => r.id !== id));

  const last7 = records.slice(0, 7).filter((r) => {
    const daysAgo = (Date.now() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const avgDuration = last7.length ? last7.reduce((s, r) => s + r.durationHours, 0) / last7.length : 0;
  const avgQuality = last7.length ? last7.reduce((s, r) => s + r.quality, 0) / last7.length : 0;
  const sleepStatus = avgDuration >= 7 && avgDuration <= 9 ? "good" : avgDuration < 6 ? "bad" : "warn";

  // Sleep analysis
  const analysis = useMemo(() => analyzeSleep(records), [records]);

  const loadDemoData = () => {
    const now = new Date();
    const demoRecords: SleepRecord[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const bedH = isWeekend ? 23 + Math.floor(Math.random() * 2) : 22 + Math.floor(Math.random() * 2);
      const bedM = Math.floor(Math.random() * 60);
      const wakeH = isWeekend ? 8 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 2);
      const wakeM = Math.floor(Math.random() * 60);
      const bed = `${String(bedH % 24).padStart(2,"0")}:${String(bedM).padStart(2,"0")}`;
      const wake = `${String(wakeH).padStart(2,"0")}:${String(wakeM).padStart(2,"0")}`;
      return {
        id: `demo-${i}`,
        date: d.toISOString().split("T")[0],
        bedTime: bed,
        wakeTime: wake,
        durationHours: calcDuration(bed, wake),
        quality: Math.min(5, Math.max(1, 3 + Math.round((Math.random() - 0.3) * 3))),
        notes: "",
      };
    });
    saveRecords(demoRecords);
  };

  const clearDemoData = () => saveRecords([]);

  return (
    <div className="sleep-tracker">
      <ModuleIntro
        title="睡眠监控"
        what="记录入睡和醒来时间，分析睡眠质量与规律性"
        how={["记录昨晚的入睡和醒来时间","查看睡眠时长趋势","获取改善睡眠的建议"]}
      />
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
            {records.some((r) => r.date === new Date().toISOString().split("T")[0]) ? "编辑今晚" : "+ 记录今晚"}
          </button>
        )}
      </div>

      {/* 睡眠分析卡片 */}
      {analysis && (
        <div style={{ margin: "16px 0", padding: "16px 18px", background: "linear-gradient(135deg, rgba(20,20,20,.95), rgba(30,30,30,.9))", border: "1px solid rgba(212,175,55,.3)", borderRadius: 12 }}>
          <h3 style={{ color: "#D4AF37", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📊 睡眠分析</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "rgba(212,175,55,.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>本周均值</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#D4AF37" }}>{analysis.avgDuration.toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>h</span></div>
            </div>
            <div style={{ background: "rgba(212,175,55,.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>规律性</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
                {[1, 2, 3].map((n) => (<span key={n} style={{ color: n <= analysis.regularity.stars ? "#D4AF37" : "rgba(255,255,255,.2)" }}>⭐</span>))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>σ={analysis.regularity.stdMin}min · {analysis.regularity.rating}</div>
            </div>
            <div style={{ background: "rgba(212,175,55,.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>社交时差</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
                {analysis.socialJetLag.diffMin !== 0 ? `${analysis.socialJetLag.diffMin > 0 ? "+" : ""}${Math.round(analysis.socialJetLag.diffMin)}min` : "—"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>周末 vs 工作日</div>
            </div>
            <div style={{ background: "rgba(212,175,55,.06)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>趋势</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: analysis.trend.change > 0 ? "#4ade80" : analysis.trend.change < 0 ? "#f87171" : "#fff" }}>
                {analysis.trend.direction !== "数据不足" ? `${analysis.trend.change > 0 ? "↑" : analysis.trend.change < 0 ? "↓" : "→"} ${Math.abs(analysis.trend.change)}h` : "—"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>vs 上周</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(212,175,55,.15)", paddingTop: 10 }}>
            {analysis.interpretations.map((text, i) => (
              <p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,.8)", margin: "4px 0", lineHeight: 1.5 }}>
                {i === 0 ? "💤" : i === 1 ? "📐" : i === 2 ? "🌙" : "📈"} {text}
              </p>
            ))}
          </div>
        </div>
      )}

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
                  <button key={n} className={`st-q-btn ${quality === n ? "active" : ""}`} onClick={() => setQuality(n)}>
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
          <div className="st-empty" style={{ textAlign: "center" }}>
            <p>还没有睡眠记录，点击上方按钮开始记录</p>
            <button onClick={loadDemoData} style={{ marginTop: 10, padding: "8px 16px", background: "rgba(212,175,55,.12)", border: "1px solid rgba(212,175,55,.4)", borderRadius: 8, color: "#D4AF37", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ✨ 加载示例数据体验
            </button>
          </div>
        ) : (
          <>
          <div style={{ marginBottom: 8 }}>
            {records.some(r => r.id.startsWith("demo-")) && (
              <button onClick={clearDemoData} style={{ padding: "4px 12px", background: "transparent", border: "1px solid rgba(212,175,55,.25)", borderRadius: 6, color: "rgba(212,175,55,.7)", fontSize: 11, cursor: "pointer" }}>
                清除示例数据
              </button>
            )}
          </div>
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
          </>
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
