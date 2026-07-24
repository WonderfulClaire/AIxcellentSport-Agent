"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ENERGY_STATES,
  buildEnergyPlan,
  recommendState,
  enrichWithLLM,
} from "../agent/energyStateEngine.ts";
import { calcEnergyScore } from "../agent/energyScoreEngine.ts";
import { getRecords, getWearable } from "../healthStore";
import { BODY_TYPES } from "../agent/tcmEngine.ts";
import { loadAgentConfig } from "../agent/index.ts";
import ModuleIntro from "./ModuleIntro";

type Ctx = {
  hour: number;
  isWeekend: boolean;
  weather: { temp?: number; humidity?: number; condition?: string } | null;
  constitution: string;
};

const SLEEP_STORAGE_KEY = "aix_sleep_v1";

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

  // Energy score state
  const [energyScore, setEnergyScore] = useState<any>(null);
  const [scoreLoading, setScoreLoading] = useState(true);

  // Load energy score data
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        // Get sleep records from both localStorage (SleepTracker) and healthStore
        let sleepRecords: any[] = [];
        try {
          const localSleep = localStorage.getItem(SLEEP_STORAGE_KEY);
          if (localSleep) sleepRecords = JSON.parse(localSleep);
        } catch {}

        // Also get healthStore records (may have sleep_hours field)
        const healthRecords = await getRecords();
        // Merge: healthStore records that have sleep_hours
        const healthSleepRecords = healthRecords
          .filter((r: any) => r.sleep_hours && r.sleep_hours > 0)
          .map((r: any) => ({ date: r.date, durationHours: r.sleep_hours, sleep_hours: r.sleep_hours }));

        // Combine, prefer local sleep tracker data
        const localDates = new Set(sleepRecords.map((r: any) => r.date));
        const combined = [...sleepRecords, ...healthSleepRecords.filter((r: any) => !localDates.has(r.date))];

        const wearable = await getWearable();

        if (cancelled) return;
        const result = calcEnergyScore(combined, wearable);
        setEnergyScore(result);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setScoreLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  // Weather loading
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
            } catch { /* ignore */ }
          },
          () => { /* 用户拒绝定位 */ },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      } catch { /* ignore */ }
    }
    loadWeather();
    return () => { cancelled = true; };
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

  // Dimension color mapping
  const dimColors: Record<string, string> = { sleep: "#8b5cf6", hr: "#ef4444", hrv: "#06b6d4", activity: "#22c55e" };

  if (!plan) {
    return (
      <div className="es-container">
        <ModuleIntro
          title="能量状态"
          what="综合心率、睡眠等数据，评估你当前的恢复与精力水平"
          how={["确保已录入近期睡眠和心率数据","查看 0-100 能量评分","根据建议调整训练强度"]}
        />

        {/* 能量评分卡片 */}
        <div style={{ margin: "0 0 20px", padding: "20px", background: "linear-gradient(135deg, rgba(15,15,15,.97), rgba(25,25,25,.95))", border: "1px solid rgba(212,175,55,.35)", borderRadius: 12 }}>
          <h3 style={{ color: "#D4AF37", fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            ⚡ 能量评分
          </h3>

          {scoreLoading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,.5)", fontSize: 13 }}>加载中...</div>
          ) : energyScore ? (
            <div>
              {/* Score display */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#D4AF37", lineHeight: 1 }}>
                    {energyScore.totalScore}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>/100</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    {energyScore.level}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
                    {energyScore.levelDescription}
                  </div>
                </div>
              </div>

              {/* Dimension bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {energyScore.dimensions.map((dim: any) => (
                  <div key={dim.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 40, fontSize: 11, color: "rgba(255,255,255,.6)", textAlign: "right" }}>{dim.label}</div>
                    <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
                      {dim.available && (
                        <div style={{ width: `${dim.score}%`, height: "100%", background: dimColors[dim.key] || "#D4AF37", borderRadius: 4, transition: "width .5s ease" }} />
                      )}
                    </div>
                    <div style={{ width: 70, fontSize: 11, color: dim.available ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.3)" }}>
                      {dim.available ? `${dim.score}分` : "无数据"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail */}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 10 }}>
                {energyScore.dimensions.filter((d: any) => d.available).map((d: any) => (
                  <span key={d.key}>{d.label}: {d.detail}</span>
                ))}
              </div>

              {/* Interpretations */}
              <div style={{ borderTop: "1px solid rgba(212,175,55,.15)", paddingTop: 10 }}>
                {energyScore.interpretations.slice(2).map((text: string, i: number) => (
                  <p key={i} style={{ fontSize: 12, color: "rgba(255,255,255,.7)", margin: "3px 0" }}>• {text}</p>
                ))}
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(212,175,55,.06)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>
                ⚠️ 仅供参考，非医疗建议。评分基于简单加权模型，非临床验证。
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>暂无足够数据计算能量评分</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>请先在「睡眠追踪」录入睡眠数据，或在「手表连接」录入心率/步数数据</p>
            </div>
          )}
        </div>

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
        <h3>�� 休息时怎么滋补身体</h3>
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
