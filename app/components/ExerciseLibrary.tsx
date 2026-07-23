"use client";

import { useEffect, useMemo, useState } from "react";

/** 动作数据集中的单条动作（字段与 /data/exercises.json 对齐） */
type ExerciseItem = {
  id: string;
  name: string;
  category: string;
  bodyPart: string;
  equipment: string;
  target: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  region: string;
  instructionsZh: string;
  instructionsEn: string;
};

/** 部位 → 强调色（与仪表盘的肌群配色保持一致） */
const REGION_COLORS: Record<string, string> = {
  胸: "#ff5a5a",
  背: "#4a90d9",
  肩: "#9b59b6",
  腿: "#b7ff2a",
  腰: "#ff9f43",
  手臂: "#2ec4b6",
  心肺: "#7d5fff",
};

function regionColor(region: string): string {
  return REGION_COLORS[region] ?? "#b7ff2a";
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function ExerciseLibrary() {
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [equipFilter, setEquipFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const [active, setActive] = useState<ExerciseItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/data/exercises.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ExerciseItem[]) => {
        if (!cancelled) setItems(data);
      })
      .catch((e) => {
        if (!cancelled) setError(`动作库加载失败：${String(e?.message ?? e)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 退出弹窗的快捷键
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );
  const equipments = useMemo(
    () => Array.from(new Set(items.map((i) => i.equipment))).sort(),
    [items],
  );
  const regions = useMemo(
    () => Array.from(new Set(items.map((i) => i.region))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (q && !it.name.toLowerCase().includes(q) && !it.instructionsZh.includes(query.trim()))
        return false;
      if (catFilter !== "all" && it.category !== catFilter) return false;
      if (equipFilter !== "all" && it.equipment !== equipFilter) return false;
      if (regionFilter !== "all" && it.region !== regionFilter) return false;
      return true;
    });
  }, [items, query, catFilter, equipFilter, regionFilter]);

  return (
    <section className="aix-lib">
      <style>{css}</style>

      <header className="aix-lib-head">
        <div>
          <span className="aix-lib-eyebrow">EXERCISE LIBRARY</span>
          <h2>动作库</h2>
          <p>对标 Dexter.AI 的千级动作库 · 共 {items.length} 个动作，按部位、器械与区域检索。</p>
        </div>
        <div className="aix-lib-search">
          <span className="aix-lib-search-icon">⌕</span>
          <input
            type="search"
            placeholder="搜索动作英文名，如 squat / plank"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索动作"
          />
        </div>
      </header>

      <div className="aix-lib-filters">
        <FilterGroup
          label="部位"
          options={categories}
          selected={catFilter}
          onSelect={setCatFilter}
          format={toTitleCase}
        />
        <FilterGroup
          label="器械"
          options={equipments}
          selected={equipFilter}
          onSelect={setEquipFilter}
          format={toTitleCase}
        />
        <FilterGroup
          label="区域"
          options={regions}
          selected={regionFilter}
          onSelect={setRegionFilter}
        />
      </div>

      {error && <div className="aix-lib-empty aix-lib-error">{error}</div>}

      {!error && loading && <div className="aix-lib-empty">动作库加载中…</div>}

      {!error && !loading && filtered.length === 0 && (
        <div className="aix-lib-empty">没有匹配的动作，试试调整筛选条件。</div>
      )}

      {!error && !loading && filtered.length > 0 && (
        <div className="aix-lib-grid">
          {filtered.map((it) => (
            <button
              key={it.id}
              className="aix-lib-card"
              onClick={() => setActive(it)}
              aria-label={`查看 ${it.name} 详情`}
            >
              <span className="aix-lib-card-name">{it.name}</span>
              <div className="aix-lib-tags">
                <span className="aix-lib-tag aix-lib-tag-cat">{toTitleCase(it.category)}</span>
                <span className="aix-lib-tag aix-lib-tag-equip">{toTitleCase(it.equipment)}</span>
                <span
                  className="aix-lib-tag aix-lib-tag-region"
                  style={{
                    color: regionColor(it.region),
                    borderColor: regionColor(it.region),
                    background: `${regionColor(it.region)}1f`,
                  }}
                >
                  {it.region}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="aix-lib-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div className="aix-lib-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="aix-lib-modal-close" onClick={() => setActive(null)} aria-label="关闭">
              ×
            </button>
            <span
              className="aix-lib-tag aix-lib-tag-region"
              style={{
                color: regionColor(active.region),
                borderColor: regionColor(active.region),
                background: `${regionColor(active.region)}1f`,
              }}
            >
              {active.region}
            </span>
            <h3>{active.name}</h3>
            <div className="aix-lib-meta">
              <span><b>部位</b>{toTitleCase(active.category)}</span>
              <span><b>器械</b>{toTitleCase(active.equipment)}</span>
              <span><b>目标</b>{toTitleCase(active.target)}</span>
            </div>
            <h4>动作说明</h4>
            <p className="aix-lib-instr">{active.instructionsZh}</p>
            <h4>主要肌群</h4>
            <p className="aix-lib-muscle">
              <b>{toTitleCase(active.muscleGroup)}</b>
              {active.secondaryMuscles?.length > 0 && (
                <>
                  {" "}
                  · 次要：{active.secondaryMuscles.map(toTitleCase).join("、")}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onSelect,
  format,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  format?: (v: string) => string;
}) {
  const show = (v: string) => (format ? format(v) : v);
  return (
    <div className="aix-lib-filter-group">
      <span className="aix-lib-filter-label">{label}</span>
      <div className="aix-lib-chips">
        <button
          className={`aix-lib-chip ${selected === "all" ? "on" : ""}`}
          onClick={() => onSelect("all")}
        >
          全部
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            className={`aix-lib-chip ${selected === opt ? "on" : ""}`}
            onClick={() => onSelect(opt)}
          >
            {show(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

const css = `
.aix-lib { --acid:#b7ff2a; --ink:#071521; --muted:#667f92; --line:rgba(7,21,33,.13); --cream:#f3f7f8;
  max-width:1440px; margin:0 auto; padding:64px 5vw 80px; font-family:Arial,Helvetica,sans-serif; color:var(--ink); }
.aix-lib-eyebrow { display:inline-flex; align-items:center; gap:8px; font:800 11px/1 monospace; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); }
.aix-lib-eyebrow::before { content:""; width:26px; height:3px; background:var(--acid); border:1px solid var(--ink); }
.aix-lib-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin-bottom:26px; }
.aix-lib-head h2 { font-size:clamp(34px,4vw,58px); margin:12px 0 8px; letter-spacing:-.055em; }
.aix-lib-head p { color:var(--muted); font-size:14px; max-width:460px; line-height:1.6; margin:0; }
.aix-lib-search { position:relative; display:flex; align-items:center; }
.aix-lib-search-icon { position:absolute; left:14px; font-size:18px; color:var(--muted); }
.aix-lib-search input { padding:12px 14px 12px 40px; min-width:300px; border:1px solid var(--line); border-radius:10px; background:#fff; font-size:14px; color:var(--ink); }
.aix-lib-search input:focus { outline:none; border-color:var(--acid); box-shadow:0 0 0 3px rgba(183,255,42,.25); }
.aix-lib-filters { display:flex; flex-direction:column; gap:14px; padding:18px; border:1px solid var(--line); border-radius:14px; background:#fff; margin-bottom:26px; }
.aix-lib-filter-group { display:flex; gap:14px; align-items:flex-start; }
.aix-lib-filter-label { flex:0 0 48px; padding-top:7px; font:700 12px monospace; color:var(--muted); letter-spacing:.04em; }
.aix-lib-chips { display:flex; flex-wrap:wrap; gap:8px; }
.aix-lib-chip { padding:7px 13px; border:1px solid var(--line); border-radius:999px; background:transparent; color:var(--ink); font-size:13px; cursor:pointer; transition:.15s; }
.aix-lib-chip:hover { border-color:var(--ink); }
.aix-lib-chip.on { background:var(--acid); border-color:var(--ink); font-weight:700; }
.aix-lib-grid { display:grid; gap:14px; grid-template-columns:repeat(2,1fr); }
@media (min-width:700px){ .aix-lib-grid{ grid-template-columns:repeat(3,1fr);} }
@media (min-width:1024px){ .aix-lib-grid{ grid-template-columns:repeat(4,1fr);} }
.aix-lib-card { display:flex; flex-direction:column; gap:12px; text-align:left; padding:16px; border:1px solid var(--line); border-radius:12px; background:#fff; cursor:pointer; transition:.18s; min-height:118px; }
.aix-lib-card:hover { border-color:var(--acid); box-shadow:5px 5px 0 var(--acid); transform:translate(-1px,-1px); }
.aix-lib-card-name { font-size:16px; font-weight:800; letter-spacing:-.02em; line-height:1.2; }
.aix-lib-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; }
.aix-lib-tag { font-size:11px; padding:3px 9px; border-radius:999px; border:1px solid var(--line); white-space:nowrap; }
.aix-lib-tag-cat { background:rgba(7,21,33,.05); color:var(--ink); }
.aix-lib-tag-equip { background:rgba(7,21,33,.05); color:var(--muted); }
.aix-lib-empty { padding:48px 20px; text-align:center; color:var(--muted); border:1px dashed var(--line); border-radius:14px; background:#fff; }
.aix-lib-error { color:#ff6b6b; border-color:#ffb3b3; }
.aix-lib-modal { position:fixed; inset:0; z-index:60; background:rgba(7,21,33,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.aix-lib-modal-box { position:relative; width:min(560px,100%); max-height:86vh; overflow:auto; background:var(--cream); border:2px solid var(--ink); border-radius:16px; box-shadow:14px 14px 0 var(--acid); padding:30px; }
.aix-lib-modal-close { position:absolute; right:16px; top:14px; width:34px; height:34px; border:1px solid var(--line); border-radius:50%; background:#fff; font-size:20px; cursor:pointer; line-height:1; }
.aix-lib-modal-box h3 { font-size:26px; margin:14px 0 16px; letter-spacing:-.03em; }
.aix-lib-modal-box h4 { margin:20px 0 8px; font-size:13px; letter-spacing:.06em; color:var(--muted); text-transform:uppercase; }
.aix-lib-meta { display:flex; flex-wrap:wrap; gap:10px; }
.aix-lib-meta span { font-size:13px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 11px; }
.aix-lib-meta b { display:block; font:700 9px monospace; color:var(--muted); letter-spacing:.08em; margin-bottom:3px; text-transform:uppercase; }
.aix-lib-instr { font-size:14px; line-height:1.75; color:var(--ink); margin:0; }
.aix-lib-muscle { font-size:14px; line-height:1.6; margin:0; }
.aix-lib-muscle b { color:var(--ink); }
`;
