"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type RepRecord = {
  exercise: string;
  repIndex: number;
  score: number;
  jointAngle: number;
  issues: string[];
  timestamp: number;
};

const STORAGE_KEY = "aix_agent_memory_v1";
const PAGE_SIZE = 20;

const EXERCISE_LABEL: Record<string, string> = {
  squat: "深蹲",
  pushup: "俯卧撑",
  jack: "开合跳",
  lunge: "弓步",
  plank: "平板支撑",
};

const EXERCISE_TYPE: Record<string, string> = {
  squat: "下肢",
  pushup: "上肢",
  jack: "全身",
  lunge: "下肢",
  plank: "核心",
};

function readRecords(): RepRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const recs = Array.isArray(parsed?.records) ? (parsed.records as RepRecord[]) : [];
    // 最新的排在最前面
    return recs.slice().sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 根据评分与问题生成一句 AI 洞察 */
function insightOf(r: RepRecord): string {
  const issues = r.issues?.filter(Boolean) ?? [];
  if (r.score >= 90) {
    return issues.length
      ? `动作评分 ${r.score}，整体优秀；细节上留意：${issues.join("、")}。`
      : `动作评分 ${r.score}，姿态标准，保持当前节奏即可。`;
  }
  if (r.score >= 75) {
    return issues.length
      ? `动作评分 ${r.score}，整体不错；重点纠正：${issues.join("、")}。`
      : `动作评分 ${r.score}，稳定性尚可，尝试放慢节奏、收紧核心。`;
  }
  return issues.length
    ? `动作评分偏低（${r.score}），建议优先处理：${issues.join("、")}。`
    : `动作评分偏低（${r.score}），建议降低速度、对照要点重做。`;
}

export default function TrainingHistory() {
  const [records, setRecords] = useState<RepRecord[] | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(""); // yyyy-mm-dd
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setRecords(readRecords());
  }, []);

  const filtered = useMemo(() => {
    let recs = records ?? [];
    if (typeFilter !== "all") {
      recs = recs.filter((r) => (EXERCISE_TYPE[r.exercise] ?? "") === typeFilter);
    }
    if (dateFilter) {
      recs = recs.filter((r) => fmtDate(r.timestamp) === dateFilter);
    }
    return recs;
  }, [records, typeFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const refresh = () => {
    setExpanded(null);
    setPage(1);
    setRecords(readRecords());
  };

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    (records ?? []).forEach((r) => {
      const t = EXERCISE_TYPE[r.exercise];
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [records]);

  return (
    <section className="aix-hist">
      <style>{css}</style>

      <header className="aix-hist-head">
        <div>
          <span className="aix-hist-eyebrow">TRAINING LOG</span>
          <h2>训练日志</h2>
          <p>每一次动作的评分、问题与 AI 洞察，按时间倒序排列。</p>
        </div>
        <button className="aix-hist-refresh" onClick={refresh}>
          ↻ 刷新
        </button>
      </header>

      {records === null ? (
        <div className="aix-hist-empty">读取本地训练记录中…</div>
      ) : records.length === 0 ? (
        <div className="aix-hist-empty">
          暂无训练记录。<br />完成几次训练后，这里会按时间记录你的每一次动作。
        </div>
      ) : (
        <>
          <div className="aix-hist-toolbar">
            <div className="aix-hist-chips">
              <button
                className={`aix-hist-chip ${typeFilter === "all" ? "on" : ""}`}
                onClick={() => {
                  setTypeFilter("all");
                  setPage(1);
                }}
              >
                全部
              </button>
              {typeOptions.map((t) => (
                <button
                  key={t}
                  className={`aix-hist-chip ${typeFilter === t ? "on" : ""}`}
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(1);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="aix-hist-date">
              日期
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            {dateFilter && (
              <button className="aix-hist-clear" onClick={() => setDateFilter("")}>
                清除日期
              </button>
            )}
          </div>

          <div className="aix-hist-table-wrap">
            <table className="aix-hist-table">
              <thead>
                <tr>
                  <th>日期时间</th>
                  <th>动作</th>
                  <th>评分</th>
                  <th>反馈摘要</th>
                  <th>AI 洞察</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, idx) => {
                  const key = (safePage - 1) * PAGE_SIZE + idx;
                  const issues = r.issues?.filter(Boolean) ?? [];
                  const isOpen = expanded === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        className="aix-hist-row"
                        onClick={() => setExpanded(isOpen ? null : key)}
                      >
                        <td>{fmtDateTime(r.timestamp)}</td>
                        <td>
                          <span className="aix-hist-ex">{EXERCISE_LABEL[r.exercise] ?? r.exercise}</span>
                          <small>{EXERCISE_TYPE[r.exercise] ?? ""}</small>
                        </td>
                        <td>
                          <span className={`aix-hist-score ${scoreTone(r.score)}`}>{r.score}</span>
                        </td>
                        <td className="aix-hist-sum">
                          {issues.length ? issues.join("、") : "动作标准"}
                        </td>
                        <td className="aix-hist-ins">{insightOf(r)}</td>
                        <td className="aix-hist-toggle">{isOpen ? "▲" : "▼"}</td>
                      </tr>
                      {isOpen && (
                        <tr className="aix-hist-detail-row">
                          <td colSpan={6}>
                            <div className="aix-hist-detail">
                              <div className="aix-hist-detail-grid">
                                <Detail label="动作" value={EXERCISE_LABEL[r.exercise] ?? r.exercise} />
                                <Detail label="第几次" value={`#${r.repIndex}`} />
                                <Detail label="评分" value={`${r.score} / 100`} />
                                <Detail label="关键角度" value={`${r.jointAngle}°`} />
                                <Detail label="时间" value={fmtDateTime(r.timestamp)} />
                                <Detail
                                  label="部位类型"
                                  value={EXERCISE_TYPE[r.exercise] ?? "—"}
                                />
                              </div>
                              <div className="aix-hist-detail-block">
                                <span className="aix-hist-detail-title">本次问题</span>
                                {issues.length ? (
                                  <ul>
                                    {issues.map((iss, i) => (
                                      <li key={i}>{iss}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>动作标准，暂无可纠正项。</p>
                                )}
                              </div>
                              <div className="aix-hist-detail-block">
                                <span className="aix-hist-detail-title">AI 洞察</span>
                                <p>{insightOf(r)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="aix-hist-pager">
            <span className="aix-hist-count">
              共 {filtered.length} 条 · 第 {safePage}/{totalPages} 页
            </span>
            <div className="aix-hist-pager-btns">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                上一页
              </button>
              <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="aix-hist-detail-item">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function scoreTone(score: number): string {
  if (score >= 90) return "good";
  if (score >= 75) return "mid";
  return "low";
}

const css = `
.aix-hist { --acid:#b7ff2a; --ink:#071521; --muted:#667f92; --line:rgba(7,21,33,.13); --cream:#f3f7f8;
  max-width:1440px; margin:0 auto; padding:64px 5vw 80px; font-family:Arial,Helvetica,sans-serif; color:var(--ink); }
.aix-hist-eyebrow { display:inline-flex; align-items:center; gap:8px; font:800 11px/1 monospace; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
.aix-hist-eyebrow::before { content:""; width:26px; height:3px; background:var(--acid); border:1px solid var(--ink); }
.aix-hist-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:26px; flex-wrap:wrap; }
.aix-hist-head h2 { font-size:clamp(34px,4vw,58px); margin:12px 0 8px; letter-spacing:-.055em; }
.aix-hist-head p { color:var(--muted); font-size:14px; max-width:460px; line-height:1.6; margin:0; }
.aix-hist-refresh { padding:10px 16px; border:2px solid var(--ink); background:var(--acid); font-weight:800; cursor:pointer; border-radius:10px; box-shadow:3px 3px 0 var(--ink); }
.aix-hist-refresh:hover { transform:translate(1px,1px); box-shadow:2px 2px 0 var(--ink); }
.aix-hist-empty { padding:60px 20px; text-align:center; color:var(--muted); border:1px dashed var(--line); border-radius:14px; background:#fff; line-height:1.7; }
.aix-hist-toolbar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
.aix-hist-chips { display:flex; flex-wrap:wrap; gap:8px; }
.aix-hist-chip { padding:7px 13px; border:1px solid var(--line); border-radius:999px; background:transparent; color:var(--ink); font-size:13px; cursor:pointer; transition:.15s; }
.aix-hist-chip:hover { border-color:var(--ink); }
.aix-hist-chip.on { background:var(--acid); border-color:var(--ink); font-weight:700; }
.aix-hist-date { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
.aix-hist-date input { padding:8px 10px; border:1px solid var(--line); border-radius:8px; font:inherit; color:var(--ink); }
.aix-hist-clear { border:none; background:transparent; color:var(--muted); cursor:pointer; font-size:13px; text-decoration:underline; }
.aix-hist-table-wrap { border:1px solid var(--line); border-radius:14px; overflow:auto; background:#fff; }
.aix-hist-table { width:100%; border-collapse:collapse; font-size:13px; min-width:760px; }
.aix-hist-table thead th { text-align:left; padding:14px 16px; font:700 10px monospace; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); background:var(--cream); }
.aix-hist-row { cursor:pointer; border-bottom:1px solid var(--line); transition:background .12s; }
.aix-hist-row:hover { background:rgba(183,255,42,.08); }
.aix-hist-table td { padding:13px 16px; vertical-align:top; line-height:1.5; }
.aix-hist-ex { display:block; font-weight:800; }
.aix-hist-ex small { color:var(--muted); font-weight:400; }
.aix-hist-score { display:inline-block; min-width:30px; text-align:center; padding:3px 8px; border-radius:8px; font-weight:800; }
.aix-hist-score.good { background:rgba(183,255,42,.22); color:#3a5a00; }
.aix-hist-score.mid { background:rgba(85,200,255,.18); color:#0a5a82; }
.aix-hist-score.low { background:rgba(255,107,107,.16); color:#b5342f; }
.aix-hist-sum { max-width:220px; color:var(--ink); }
.aix-hist-ins { max-width:300px; color:var(--muted); }
.aix-hist-toggle { width:36px; text-align:center; color:var(--muted); }
.aix-hist-detail-row td { background:var(--cream); padding:0; }
.aix-hist-detail { padding:20px; display:flex; flex-direction:column; gap:18px; }
.aix-hist-detail-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
@media (max-width:680px){ .aix-hist-detail-grid{ grid-template-columns:repeat(2,1fr);} }
.aix-hist-detail-item { background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px; }
.aix-hist-detail-item span { display:block; font:700 9px monospace; letter-spacing:.08em; color:var(--muted); text-transform:uppercase; margin-bottom:5px; }
.aix-hist-detail-item b { font-size:16px; }
.aix-hist-detail-block { background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px; }
.aix-hist-detail-title { display:block; font:700 11px monospace; letter-spacing:.06em; color:var(--acid); margin-bottom:8px; -webkit-text-stroke:.3px var(--ink); }
.aix-hist-detail-block p { margin:0; font-size:14px; line-height:1.6; color:var(--ink); }
.aix-hist-detail-block ul { margin:0; padding-left:18px; }
.aix-hist-detail-block li { font-size:14px; line-height:1.6; color:var(--ink); }
.aix-hist-pager { display:flex; justify-content:space-between; align-items:center; margin-top:18px; flex-wrap:wrap; gap:12px; }
.aix-hist-count { font-size:13px; color:var(--muted); }
.aix-hist-pager-btns { display:flex; gap:10px; }
.aix-hist-pager-btns button { padding:9px 16px; border:2px solid var(--ink); background:#fff; font-weight:800; cursor:pointer; border-radius:10px; }
.aix-hist-pager-btns button:disabled { opacity:.4; cursor:not-allowed; }
.aix-hist-pager-btns button:not(:disabled):hover { background:var(--acid); }
`;
