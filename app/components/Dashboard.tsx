"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** 训练记录（与 app/agent/memory.js 写入 localStorage 的结构一致） */
type RepRecord = {
  exercise: string;
  repIndex: number;
  score: number;
  jointAngle: number;
  issues: string[];
  timestamp: number;
};

const STORAGE_KEY = "aix_agent_memory_v1";
const CHART_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";

/** 训练动作 → 中文名 */
const EXERCISE_LABEL: Record<string, string> = {
  squat: "深蹲",
  pushup: "俯卧撑",
  jack: "开合跳",
  lunge: "弓步",
  plank: "平板支撑",
};

/** 训练动作 → 主训部位（用于肌群分布饼图） */
const EXERCISE_REGION: Record<string, string> = {
  squat: "腿",
  pushup: "胸",
  jack: "肩",
  lunge: "腿",
  plank: "腰",
};

/** 部位配色：胸(红)、背(蓝)、肩(紫)、腿(绿)、腰(橙)、手臂(青) */
const REGION_COLORS: Record<string, string> = {
  胸: "#ff5a5a",
  背: "#4a90d9",
  肩: "#9b59b6",
  腿: "#b7ff2a",
  腰: "#ff9f43",
  手臂: "#2ec4b6",
};

const ALL_REGIONS = ["胸", "背", "肩", "腿", "腰", "手臂"];

type ChartCtor = new (
  ctx: HTMLCanvasElement | CanvasRenderingContext2D,
  cfg: unknown,
) => { destroy(): void };

function loadChartScript(): Promise<ChartCtor> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).Chart) {
      resolve((window as any).Chart as ChartCtor);
      return;
    }
    const existing = document.getElementById("aix-chartjs") as HTMLScriptElement | null;
    const onReady = () => resolve((window as any).Chart as ChartCtor);
    if (existing) {
      if ((window as any).Chart) onReady();
      else existing.addEventListener("load", onReady);
      return;
    }
    const s = document.createElement("script");
    s.id = "aix-chartjs";
    s.src = CHART_SRC;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("Chart.js 加载失败（请检查网络）"));
    document.body.appendChild(s);
  });
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readRecords(): RepRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.records) ? (parsed.records as RepRecord[]) : [];
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const [records, setRecords] = useState<RepRecord[] | null>(null);
  const [chartErr, setChartErr] = useState<string | null>(null);

  const doughnutRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const hbarRef = useRef<HTMLCanvasElement>(null);
  const chartRefs = useRef<{ destroy(): void }[]>([]);

  // 读取训练记录
  useEffect(() => {
    setRecords(readRecords());
  }, []);

  // 统计指标
  const stats = useMemo(() => {
    const recs = records ?? [];
    const total = recs.length;
    const avg =
      total > 0 ? Math.round(recs.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
    const activeDays = new Set(recs.map((r) => startOfDay(r.timestamp))).size;
    return { total, avg, activeDays, totalReps: total };
  }, [records]);

  // 在 Chart.js 就绪后绘制全部图表
  useEffect(() => {
    if (records === null) return;
    let destroyed = false;
    chartRefs.current.forEach((c) => c.destroy());
    chartRefs.current = [];

    if (records.length === 0) return; // 空状态由 UI 处理

    loadChartScript()
      .then((Chart) => {
        if (destroyed) return;
        const defs = (window as any).Chart?.defaults;
        if (defs) {
          defs.color = "#667f92";
          defs.font.family = "Arial, Helvetica, sans-serif";
        }
        const baseGrid = { color: "rgba(7,21,33,.08)" };
        const recs = records;

        // a) 肌群分布饼图（Doughnut）
        if (doughnutRef.current) {
          const regionCounts = ALL_REGIONS.map(
            (reg) => recs.filter((r) => EXERCISE_REGION[r.exercise] === reg).length,
          );
          chartRefs.current.push(
            new Chart(doughnutRef.current, {
              type: "doughnut",
              data: {
                labels: ALL_REGIONS,
                datasets: [
                  {
                    data: regionCounts,
                    backgroundColor: ALL_REGIONS.map((r) => REGION_COLORS[r]),
                    borderColor: "#f3f7f8",
                    borderWidth: 2,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 12 } } } },
              },
            }),
          );
        }

        // b) 训练日容量柱状图（最近 14 天）
        if (barRef.current) {
          const days: number[] = [];
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push(d.getTime());
          }
          const labels = days.map((d) => {
            const dt = new Date(d);
            return `${dt.getMonth() + 1}/${dt.getDate()}`;
          });
          const data = days.map(
            (d) => recs.filter((r) => startOfDay(r.timestamp) === d).length,
          );
          chartRefs.current.push(
            new Chart(barRef.current, {
              type: "bar",
              data: {
                labels,
                datasets: [
                  {
                    label: "训练次数",
                    data,
                    backgroundColor: "#b7ff2a",
                    borderRadius: 6,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: baseGrid, ticks: { precision: 0 } },
                },
              },
            }),
          );
        }

        // c) 月度趋势折线图（近 6 个月）
        if (lineRef.current) {
          const months: Date[] = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
          }
          const labels = months.map((m) => `${m.getFullYear()}-${m.getMonth() + 1}`);
          const data = months.map((m) =>
            recs.filter((r) => {
              const dt = new Date(r.timestamp);
              return dt.getFullYear() === m.getFullYear() && dt.getMonth() === m.getMonth();
            }).length,
          );
          chartRefs.current.push(
            new Chart(lineRef.current, {
              type: "line",
              data: {
                labels,
                datasets: [
                  {
                    label: "月度训练总量",
                    data,
                    borderColor: "#55c8ff",
                    backgroundColor: "rgba(85,200,255,.18)",
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: "#071521",
                    pointRadius: 4,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: baseGrid, ticks: { precision: 0 } },
                },
              },
            }),
          );
        }

        // d) 高频动作排名（水平柱状图 Top 10）
        if (hbarRef.current) {
          const counts: Record<string, number> = {};
          recs.forEach((r) => {
            counts[r.exercise] = (counts[r.exercise] || 0) + 1;
          });
          const top = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
          const labels = top.map(([e]) => EXERCISE_LABEL[e] ?? e);
          const data = top.map(([, c]) => c);
          chartRefs.current.push(
            new Chart(hbarRef.current, {
              type: "bar",
              data: {
                labels,
                datasets: [
                  {
                    label: "完成次数",
                    data,
                    backgroundColor: "#b7ff2a",
                    borderRadius: 6,
                  },
                ],
              },
              options: {
                indexAxis: "y" as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { beginAtZero: true, grid: baseGrid, ticks: { precision: 0 } },
                  y: { grid: { display: false } },
                },
              },
            }),
          );
        }
      })
      .catch((e) => {
        if (!destroyed) setChartErr(String(e?.message ?? e));
      });

    return () => {
      destroyed = true;
      chartRefs.current.forEach((c) => c.destroy());
      chartRefs.current = [];
    };
  }, [records]);

  const refresh = () => {
    setChartErr(null);
    setRecords(readRecords());
  };

  return (
    <section className="aix-dash">
      <style>{css}</style>

      <header className="aix-dash-head">
        <div>
          <span className="aix-dash-eyebrow">DASHBOARD</span>
          <h2>训练数据看板</h2>
          <p>对标吾生的可视化图表 · 数据来自本地训练记录，不上传服务器。</p>
        </div>
        <button className="aix-dash-refresh" onClick={refresh}>
          ↻ 刷新
        </button>
      </header>

      {records === null ? (
        <div className="aix-dash-empty">读取本地训练记录中…</div>
      ) : records.length === 0 ? (
        <div className="aix-dash-empty">
          暂无训练记录。<br />打开「实时教练」完成几次动作后，这里会出现你的专属图表。
        </div>
      ) : (
        <>
          {/* a) 总体统计卡片 */}
          <div className="aix-stat-grid">
            <StatCard label="训练总次数" value={stats.total} unit="次" />
            <StatCard label="活跃训练日" value={stats.activeDays} unit="天" />
            <StatCard label="平均评分" value={stats.avg} unit="/100" />
            <StatCard label="总组数" value={stats.totalReps} unit="组" />
          </div>

          {chartErr && <div className="aix-dash-empty aix-dash-error">{chartErr}</div>}

          <div className="aix-chart-grid">
            <div className="aix-chart-card aix-chart-card-wide">
              <h3>肌群分布</h3>
              <div className="aix-chart-canvas">
                <canvas ref={doughnutRef} />
              </div>
            </div>

            <div className="aix-chart-card">
              <h3>近 14 天训练容量</h3>
              <div className="aix-chart-canvas">
                <canvas ref={barRef} />
              </div>
            </div>

            <div className="aix-chart-card">
              <h3>近 6 个月趋势</h3>
              <div className="aix-chart-canvas">
                <canvas ref={lineRef} />
              </div>
            </div>

            <div className="aix-chart-card aix-chart-card-wide">
              <h3>高频动作 Top 10</h3>
              <div className="aix-chart-canvas">
                <canvas ref={hbarRef} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="aix-stat">
      <span className="aix-stat-label">{label}</span>
      <strong className="aix-stat-value">
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}

const css = `
.aix-dash { --acid:#b7ff2a; --ink:#071521; --muted:#667f92; --line:rgba(7,21,33,.13); --cream:#f3f7f8;
  max-width:1440px; margin:0 auto; padding:64px 5vw 80px; font-family:Arial,Helvetica,sans-serif; color:var(--ink); }
.aix-dash-eyebrow { display:inline-flex; align-items:center; gap:8px; font:800 11px/1 monospace; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
.aix-dash-eyebrow::before { content:""; width:26px; height:3px; background:var(--acid); border:1px solid var(--ink); }
.aix-dash-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:26px; flex-wrap:wrap; }
.aix-dash-head h2 { font-size:clamp(34px,4vw,58px); margin:12px 0 8px; letter-spacing:-.055em; }
.aix-dash-head p { color:var(--muted); font-size:14px; max-width:460px; line-height:1.6; margin:0; }
.aix-dash-refresh { padding:10px 16px; border:2px solid var(--ink); background:var(--acid); font-weight:800; cursor:pointer; border-radius:10px; box-shadow:3px 3px 0 var(--ink); }
.aix-dash-refresh:hover { transform:translate(1px,1px); box-shadow:2px 2px 0 var(--ink); }
.aix-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
@media (max-width:820px){ .aix-stat-grid{ grid-template-columns:repeat(2,1fr);} }
.aix-stat { border:1px solid var(--line); border-radius:14px; background:#fff; padding:20px; display:flex; flex-direction:column; gap:10px; }
.aix-stat-label { font:700 11px monospace; letter-spacing:.06em; color:var(--muted); text-transform:uppercase; }
.aix-stat-value { font-size:46px; line-height:1; letter-spacing:-.06em; color:var(--ink); }
.aix-stat-value small { font-size:14px; color:var(--muted); margin-left:6px; letter-spacing:0; }
.aix-chart-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
.aix-chart-card-wide { grid-column:1 / -1; }
@media (max-width:820px){ .aix-chart-grid{ grid-template-columns:1fr;} }
.aix-chart-card { border:1px solid var(--line); border-radius:14px; background:#fff; padding:18px 18px 8px; }
.aix-chart-card h3 { margin:0 0 12px; font-size:15px; letter-spacing:-.01em; }
.aix-chart-canvas { position:relative; height:260px; }
.aix-dash-empty { padding:60px 20px; text-align:center; color:var(--muted); border:1px dashed var(--line); border-radius:14px; background:#fff; line-height:1.7; }
.aix-dash-error { color:#ff6b6b; border-color:#ffb3b3; }
`;
