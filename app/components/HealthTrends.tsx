"use client";

import { useEffect, useState, useMemo } from "react";
import { getRecords, getWearable } from "../healthStore";

/* ─── Types ─── */
type DataPoint = { date: string; value: number };
type RangeMode = 30 | 90;
type MetricKey = "weight" | "heartRate" | "sleep" | "steps";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { key: "weight", label: "体重", unit: "kg" },
  { key: "heartRate", label: "心率", unit: "bpm" },
  { key: "sleep", label: "睡眠", unit: "h" },
  { key: "steps", label: "步数", unit: "步" },
];

/* ─── Demo data generator ─── */
function generateDemoData(days: number): Record<MetricKey, DataPoint[]> {
  const now = Date.now();
  const DAY = 86400000;
  const pts = (gen: () => number): DataPoint[] =>
    Array.from({ length: days }, (_, i) => ({
      date: new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10),
      value: gen(),
    }));
  return {
    weight: pts(() => +(55 + Math.random() * 15).toFixed(1)),
    heartRate: pts(() => Math.round(55 + Math.random() * 20)),
    sleep: pts(() => +(5 + Math.random() * 4).toFixed(1)),
    steps: pts(() => Math.round(3000 + Math.random() * 9000)),
  };
}

/* ─── SVG Chart Component ─── */
function TrendChart({ data, config }: { data: DataPoint[]; config: MetricConfig }) {
  const W = 320;
  const H = 160;
  const PAD_L = 38;
  const PAD_R = 8;
  const PAD_T = 14;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const { points, areaPath, yTicks, xLabels, lastPt } = useMemo(() => {
    if (!data.length)
      return { points: "", areaPath: "", yTicks: [] as number[], xLabels: [] as { x: number; label: string }[], lastPt: null as null | { cx: number; cy: number } };

    const vals = data.map((d) => d.value);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    const span = maxV - minV || 1;
    minV = minV - span * 0.08;
    maxV = maxV + span * 0.08;

    const toX = (i: number) => PAD_L + (i / Math.max(1, data.length - 1)) * chartW;
    const toY = (v: number) => PAD_T + chartH - ((v - minV) / (maxV - minV)) * chartH;

    const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ");
    const first = toX(0);
    const last = toX(data.length - 1);
    const bottom = PAD_T + chartH;
    const area =
      `M${first.toFixed(1)},${bottom.toFixed(1)} ` +
      data.map((d, i) => `L${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(" ") +
      ` L${last.toFixed(1)},${bottom.toFixed(1)} Z`;

    const yTicks: number[] = [];
    for (let i = 0; i <= 3; i++) {
      yTicks.push(minV + (i / 3) * (maxV - minV));
    }

    const step = Math.max(1, Math.floor(data.length / 4));
    const xLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < data.length; i += step) {
      xLabels.push({ x: toX(i), label: data[i].date.slice(5) });
    }
    if (xLabels.length && xLabels[xLabels.length - 1].label !== data[data.length - 1].date.slice(5)) {
      xLabels.push({ x: toX(data.length - 1), label: data[data.length - 1].date.slice(5) });
    }

    const lx = toX(data.length - 1);
    const ly = toY(data[data.length - 1].value);

    return { points: pts, areaPath: area, yTicks, xLabels, lastPt: { cx: lx, cy: ly } };
  }, [data, chartW, chartH]);

  const latestVal = data.length ? data[data.length - 1].value : null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>{config.label}</span>
        {latestVal !== null && (
          <span style={styles.cardValue}>
            {config.key === "steps" ? latestVal.toLocaleString() : latestVal}
            <small style={styles.cardUnit}> {config.unit}</small>
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={styles.svg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`grad-${config.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(212,175,55,.4)" />
            <stop offset="100%" stopColor="rgba(212,175,55,.02)" />
          </linearGradient>
        </defs>
        {/* Y grid lines */}
        {[0, 1, 2, 3].map((i) => {
          const y = PAD_T + chartH - (i / 3) * chartH;
          return (
            <line key={i} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(212,175,55,.15)" strokeWidth="0.5" strokeDasharray="3,3" />
          );
        })}
        {/* Y labels */}
        {yTicks.map((v, i) => {
          const y = PAD_T + chartH - (i / 3) * chartH;
          return (
            <text key={i} x={PAD_L - 4} y={y + 3} textAnchor="end" fill="#D4AF37" fontSize="8" opacity="0.7">
              {config.key === "steps" ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v).toString()) : v.toFixed(config.key === "weight" || config.key === "sleep" ? 1 : 0)}
            </text>
          );
        })}
        {/* X labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 6} textAnchor="middle" fill="#D4AF37" fontSize="7.5" opacity="0.6">
            {l.label}
          </text>
        ))}
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#grad-${config.key})`} />}
        {/* Line */}
        {points && <polyline points={points} fill="none" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
        {/* Last point dot */}
        {lastPt && <circle cx={lastPt.cx} cy={lastPt.cy} r="3" fill="#F4D27A" stroke="#D4AF37" strokeWidth="1" />}
      </svg>
    </div>
  );
}

/* ─── Main Component ─── */
export default function HealthTrends() {
  const [range, setRange] = useState<RangeMode>(30);
  const [realData, setRealData] = useState<Record<MetricKey, DataPoint[]> | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [records, wearable] = await Promise.all([getRecords(), getWearable()]);
        if (cancelled) return;

        const now = Date.now();
        const cutoff = now - range * 86400000;

        const filterByDate = (arr: any[]) =>
          arr.filter((r: any) => {
            if (!r.date) return false;
            return new Date(r.date).getTime() >= cutoff;
          }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const filteredRecords = filterByDate(records);
        const filteredWearable = filterByDate(wearable);

        const heartRate: DataPoint[] = filteredWearable
          .filter((w: any) => w.resting_hr || w.avg_hr)
          .map((w: any) => ({ date: w.date, value: w.resting_hr || w.avg_hr }));

        const steps: DataPoint[] = filteredWearable
          .filter((w: any) => w.steps)
          .map((w: any) => ({ date: w.date, value: w.steps }));

        const sleepMap = new Map<string, number>();
        filteredRecords.filter((r: any) => r.sleep_hours).forEach((r: any) => sleepMap.set(r.date, r.sleep_hours));
        filteredWearable.filter((w: any) => w.sleep_hours).forEach((w: any) => sleepMap.set(w.date, w.sleep_hours));
        const sleep: DataPoint[] = Array.from(sleepMap.entries())
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const weight: DataPoint[] = filteredRecords
          .filter((r: any) => r.weight)
          .map((r: any) => ({ date: r.date, value: r.weight }));

        const result: Record<MetricKey, DataPoint[]> = { weight, heartRate, sleep, steps };
        const hasAny = Object.values(result).some((arr) => arr.length > 0);

        setRealData(hasAny ? result : null);
      } catch {
        setRealData(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const demoData = useMemo(() => generateDemoData(range), [range, demoMode]);

  const hasRealData = realData && Object.values(realData).some((arr) => arr.length > 0);
  const displayData: Record<MetricKey, DataPoint[]> = hasRealData
    ? realData!
    : demoMode
    ? demoData
    : { weight: [], heartRate: [], sleep: [], steps: [] };
  const showEmpty = !hasRealData && !demoMode;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>✦ 健康趋势</h2>
          <p style={styles.subtitle}>体重 · 心率 · 睡眠 · 步数多维度追踪</p>
        </div>
        <div style={styles.toggleRow}>
          <button
            style={range === 30 ? { ...styles.toggleBtn, ...styles.toggleActive } : styles.toggleBtn}
            onClick={() => setRange(30)}
          >
            30 天
          </button>
          <button
            style={range === 90 ? { ...styles.toggleBtn, ...styles.toggleActive } : styles.toggleBtn}
            onClick={() => setRange(90)}
          >
            90 天
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyWrap}>
          <p style={styles.emptyText}>加载数据中…</p>
        </div>
      ) : showEmpty ? (
        <div style={styles.emptyWrap}>
          <p style={styles.emptyIcon}>📊</p>
          <p style={styles.emptyText}>暂无健康趋势数据</p>
          <p style={styles.emptyHint}>连接可穿戴设备或手动记录后，趋势图将自动显示</p>
          <button style={styles.demoBtn} onClick={() => setDemoMode(true)}>
            ✦ 加载示例数据
          </button>
        </div>
      ) : (
        <>
          {demoMode && !hasRealData && (
            <div style={styles.demoBanner}>
              <span>📋 当前展示为模拟示例数据</span>
              <button style={styles.demoDismiss} onClick={() => setDemoMode(false)}>关闭示例</button>
            </div>
          )}
          <div style={styles.grid}>
            {METRICS.map((m) => (
              <TrendChart key={m.key} data={displayData[m.key]} config={m} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 16px 64px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  title: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#ECE7D8",
    fontSize: 13,
    opacity: 0.7,
    margin: "4px 0 0",
  },
  toggleRow: {
    display: "flex",
    gap: 6,
  },
  toggleBtn: {
    padding: "6px 16px",
    borderRadius: 8,
    border: "1px solid rgba(212,175,55,.3)",
    background: "rgba(24,22,18,.8)",
    color: "#D4AF37",
    fontSize: 13,
    cursor: "pointer",
    transition: "all .2s",
  },
  toggleActive: {
    background: "rgba(212,175,55,.18)",
    borderColor: "#D4AF37",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "rgba(24,22,18,.92)",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,.12)",
    padding: "14px 16px 10px",
    minHeight: 200,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    color: "#ECE7D8",
    fontSize: 14,
    fontWeight: 600,
  },
  cardValue: {
    color: "#F4D27A",
    fontSize: 18,
    fontWeight: 700,
  },
  cardUnit: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: 400,
  },
  svg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  emptyWrap: {
    textAlign: "center" as const,
    padding: "60px 20px",
    background: "rgba(24,22,18,.92)",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,.12)",
  },
  emptyIcon: {
    fontSize: 40,
    margin: "0 0 12px",
  },
  emptyText: {
    color: "#ECE7D8",
    fontSize: 16,
    margin: "0 0 6px",
  },
  emptyHint: {
    color: "#ECE7D8",
    fontSize: 13,
    opacity: 0.55,
    margin: "0 0 20px",
  },
  demoBtn: {
    padding: "10px 24px",
    borderRadius: 8,
    border: "1px solid #D4AF37",
    background: "rgba(212,175,55,.12)",
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
  },
  demoBanner: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: "8px 16px",
    marginBottom: 16,
    borderRadius: 8,
    background: "rgba(212,175,55,.08)",
    border: "1px solid rgba(212,175,55,.2)",
    color: "#F4D27A",
    fontSize: 13,
  },
  demoDismiss: {
    padding: "3px 10px",
    borderRadius: 6,
    border: "1px solid rgba(212,175,55,.3)",
    background: "transparent",
    color: "#D4AF37",
    fontSize: 12,
    cursor: "pointer",
  },
};
