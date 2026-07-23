"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ENERGY_STATES,
  buildEnergyPlan,
  recommendState,
  enrichWithLLM,
} from "../agent/energyStateEngine.js";
import { BODY_TYPES } from "../agent/tcmEngine.js";
import { loadAgentConfig } from "../agent/index.js";

type Ctx = {
  hour: number;
  isWeekend: boolean;
  weather: { temp?: number; humidity?: number; condition?: string } | null;
  constitution: string;
};

export default function EnergyState() {
  const [selected, setSelected] = useState<string | null>(null);
  const [constitution, setConstitution] = useState<string>("balanced");
  const [ctx, setCtx] = useState<Ctx>({
    hour: new Date().getHours(),
    isWeekend: [0, 6].includes(new Date().getDay()),
    weather: null,
    constitution: "balanced",
  });
  const [plan, setPlan] = useState<any>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [llmText, setLlmText] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmMsg, setLlmMsg] = useState<string | null>(null);

  // 尝试获取天气（best-effort，失败不影响主流程）
  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`;
              const r = await fetch(url);
              const d = await r.json();
              if (cancelled) return;
              const c = d.current;
              const codeMap: Record<number, string> = {
                0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
                45: "雾", 48: "雾", 51: "毛毛雨", 53: "小雨", 55: "中雨",
                61: "小雨", 63: "中雨", 65: "大雨", 71: "雪", 75: "大雪",
                80: "阵雨", 81: "阵雨", 82: "强阵雨", 95: "雷雨",
              };
              setCtx((p) => ({
                ...p,
                weather: {
                  temp: Math.round(c.temperature_2m),
                  humidity: c.relative_humidity_2m,
                  condition: codeMap[c.weather_code] || "未知",
                },
              }));
            } catch {
              /* ignore */
            }
          },
          () => {
            /* 用户拒绝定位，跳过天气 */
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      } catch {
        /* ignore */
      }
    }
    loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectState = (id: string) => {
    const fullCtx = { ...ctx, constitution };
    const p = buildEnergyPlan(id, fullCtx);
    setSelected(id);
    setPlan(p);
    setDone(new Set());
    setLlmText(null);
    setLlmMsg(null);
  };

  const autoRecommend = () => {
    const id = recommendState({ isWeekend: ctx.isWeekend, hour: ctx.hour });
    selectState(id);
  };

  const runLLM = async () => {
    if (!selected || !plan) return;
    setLlmLoading(true);
    setLlmMsg(null);
    try {
      const cfg = loadAgentConfig();
      if (!cfg?.apiKey) {
        setLlmMsg("未配置 LLM 密钥，无法调用深度分析。可在「设置」中配置后重试（规则版建议已足够实用）。");
        setLlmLoading(false);
        return;
      }
      const text = await enrichWithLLM(selected, { ...ctx, constitution }, plan);
      if (text) setLlmText(text as string);
      else setLlmMsg("本次调用未返回内容，可稍后重试。");
    } catch {
      setLlmMsg("调用出错，已回退到规则版建议。");
    } finally {
      setLlmLoading(false);
    }
  };

  const toggleDone = (i: number) => {
    setDone((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const stateList = useMemo(() => Object.values(ENERGY_STATES), []);

  if (!plan) {
    return (
      <div className="es-container">
        <div className="es-header">
          <h2>🔋 能量状态自适应健康方案</h2>
          <p>人不是一直忙，也不是一直闲。你正处在哪种「能量态」？我们据此给你最贴合的中医滋补 + 明星规划师式能量管理。</p>
        </div>

        <div className="es-quick">
          <button className="es-auto-btn" onClick={autoRecommend}>
            ⚡ 根据今天自动推荐（{ctx.isWeekend ? "周末" : "工作日"} · {ctx.hour < 12 ? "上午" : ctx.hour < 18 ? "下午" : "晚间"}）
          </button>
        </div>

        <div className="es-constitution">
          <label>你的体质（可选，用于更精准建议）：</label>
          <select value={constitution} onChange={(e) => setConstitution(e.target.value)}>
            {BODY_TYPES.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="es-state-grid">
          {stateList.map((s: any) => (
            <button
              key={s.id}
              className="es-state-card"
              style={{ borderColor: s.color }}
              onClick={() => selectState(s.id)}
            >
              <span className="es-state-icon" style={{ background: s.color }}>
                {s.icon}
              </span>
              <strong>{s.label}</strong>
              <small className="es-pattern">{s.tcmPattern}</small>
              <span className="es-card-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const doneCount = done.size;
  const total = plan.actions.length;

  return (
    <div className="es-container">
      <button className="es-back" onClick={() => setPlan(null)}>
        ← 重新选择状态
      </button>

      {/* 状态 Hero 卡 */}
      <div className="es-hero" style={{ borderColor: plan.state.color }}>
        <div className="es-hero-left">
          <span className="es-hero-icon" style={{ background: plan.state.color }}>
            {plan.state.icon}
          </span>
          <div>
            <h2 style={{ color: plan.state.color }}>{plan.state.label}</h2>
            <div className="es-pattern">{plan.state.tcmPattern}</div>
            <p className="es-hero-desc">{plan.state.desc}</p>
          </div>
        </div>
        <div className="es-chips">
          <span className="es-chip">🌿 节气 {plan.context.solarTerm}</span>
          <span className="es-chip">🌤️ {plan.context.weather}</span>
          <span className="es-chip">🧬 {plan.context.constitution}</span>
          <span className="es-chip">⏰ {plan.context.timeSlot}</span>
          <span className="es-chip">{plan.context.isWeekend ? "🌿 周末" : "💼 工作日"}</span>
        </div>
      </div>

      {/* 双栏：中医 + 规划师 */}
      <div className="es-dual">
        <div className="es-card es-tcm">
          <h3>🌿 中医调理方案</h3>
          <div className="es-principle">调理方向：{plan.tcm.principle}</div>
          <h5>🍲 食疗建议</h5>
          <ul className="es-list">{plan.tcm.diet.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
          <h5>💆 穴位保健</h5>
          <ul className="es-list">{plan.tcm.acupoints.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
          <h5>⛔ 宜忌</h5>
          <ul className="es-list es-avoid">{plan.tcm.avoid.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
          <h5>🔗 节气 / 天气 / 体质联动</h5>
          <ul className="es-list es-extras">{plan.tcm.extras.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
        </div>

        <div className="es-card es-planner">
          <h3>🌟 明星规划师 · 能量管理</h3>
          <h5>📋 能量策略</h5>
          <ul className="es-list">{plan.planner.strategy.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
          <h5>💊 补给清单</h5>
          <ul className="es-list es-supp">{plan.planner.supplements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      {/* 调出高能量 */}
      <div className="es-box es-high">
        <h3>⚡ 如何把高能量调出来</h3>
        <ul className="es-list">
          {plan.highEnergy.map((h: string, i: number) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      {/* 休息滋补 */}
      <div className="es-box es-nourish">
        <h3>🛌 休息时怎么滋补身体</h3>
        <ul className="es-list">
          {plan.nourish.map((n: string, i: number) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      {/* 今日行动清单 */}
      <div className="es-box es-actions">
        <div className="es-actions-head">
          <h3>✅ 今日行动清单</h3>
          <span className="es-progress">
            {doneCount}/{total} 完成
          </span>
        </div>
        <div className="es-action-list">
          {plan.actions.map((a: any, i: number) => (
            <label key={i} className={`es-action ${a.isNow ? "now" : ""} ${done.has(i) ? "done" : ""}`}>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggleDone(i)} />
              <span className="es-action-slot">{a.slotLabel}</span>
              {a.isNow && <span className="es-now-badge">现在适合</span>}
              <span className="es-action-text">{a.text}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AI 深度分析 */}
      <div className="es-box es-llm">
        <div className="es-llm-head">
          <h3>🤖 AI 深度个性化处方</h3>
          <button className="es-llm-btn" onClick={runLLM} disabled={llmLoading}>
            {llmLoading ? "生成中…" : "生成我的专属处方"}
          </button>
        </div>
        {llmText && <p className="es-llm-text">{llmText}</p>}
        {llmMsg && <p className="es-llm-msg">{llmMsg}</p>}
      </div>
    </div>
  );
}
