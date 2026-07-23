"use client";

import { useState, useCallback } from "react";
import {
  calcBMR,
  calcTDEE,
  calcMacros,
  getCyclePhase,
  generateNutritionPlan,
  generateEventPrep,
} from "../agent/nutritionPlanner.js";
import { loadAgentConfig } from "../agent/index.js";

type Profile = {
  gender: "male" | "female";
  age: number;
  height: number;
  weight: number;
  activity: string;
  goal: string;
  diet: string;
  restrictions: string;
  conditions: string;
  cycleDay?: number;
};

type Plan = {
  summary: string;
  principles: string[];
  weeklyPlan: Record<string, { breakfast: string; lunch: string; dinner: string; snack: string }>;
  supplements: string[];
  antiInflammatory: string[];
  skinGlow: string[];
  cycleNutrition: string | null;
  groceryList: string[];
  eventPrep: string;
  tips: string[];
  bmr: number;
  tdee: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  cycle?: { phase: string; desc: string; focus: string } | null;
};

export default function PrivateNutrition() {
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [profile, setProfile] = useState<Profile>({
    gender: "female", age: 28, height: 165, weight: 55,
    activity: "moderate", goal: "lose", diet: "", restrictions: "", conditions: "", cycleDay: 14,
  });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedDay, setSelectedDay] = useState("周一");
  const [eventType, setEventType] = useState("");
  const [eventPlan, setEventPlan] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(false);

  const update = (k: keyof Profile, v: any) => setProfile(p => ({ ...p, [k]: v }));

  const generate = useCallback(async () => {
    setStep("loading");
    const config = loadAgentConfig();
    if (config?.apiKey) {
      const result = await generateNutritionPlan(profile);
      setPlan(result);
    } else {
      // 本地基础版
      const bmr = calcBMR(profile);
      const tdee = calcTDEE(bmr, profile.activity);
      const macros = calcMacros(tdee, profile.goal);
      const cycle = profile.gender === "female" ? getCyclePhase(profile.cycleDay) : null;
      const fallback = await generateNutritionPlan(profile);
      setPlan({ ...fallback, bmr, tdee, macros, cycle });
    }
    setStep("result");
  }, [profile]);

  const handleEventPrep = useCallback(async () => {
    if (!eventType) return;
    setEventLoading(true);
    const r = await generateEventPrep(eventType, 7);
    setEventPlan(r);
    setEventLoading(false);
  }, [eventType]);

  if (step === "form") {
    return (
      <div className="pn-form">
        <div className="pn-header">
          <h2>🥗 你的私人营养师</h2>
          <p>像明星一样，拥有专属定制的营养方案</p>
        </div>

        <div className="pn-form-grid">
          <div className="pn-field">
            <label>性别</label>
            <div className="pn-toggle">
              <button className={profile.gender === "female" ? "active" : ""} onClick={() => update("gender", "female")}>女</button>
              <button className={profile.gender === "male" ? "active" : ""} onClick={() => update("gender", "male")}>男</button>
            </div>
          </div>

          <div className="pn-field">
            <label>年龄</label>
            <input type="number" value={profile.age} onChange={e => update("age", +e.target.value)} />
          </div>

          <div className="pn-field">
            <label>身高 (cm)</label>
            <input type="number" value={profile.height} onChange={e => update("height", +e.target.value)} />
          </div>

          <div className="pn-field">
            <label>体重 (kg)</label>
            <input type="number" value={profile.weight} onChange={e => update("weight", +e.target.value)} />
          </div>

          <div className="pn-field">
            <label>活动水平</label>
            <select value={profile.activity} onChange={e => update("activity", e.target.value)}>
              <option value="sedentary">久坐（办公室）</option>
              <option value="light">轻度（每周1-2次运动）</option>
              <option value="moderate">中度（每周3-4次）</option>
              <option value="active">高度（每周5+次）</option>
              <option value="athlete">运动员级</option>
            </select>
          </div>

          <div className="pn-field">
            <label>目标</label>
            <select value={profile.goal} onChange={e => update("goal", e.target.value)}>
              <option value="lose">减脂塑形</option>
              <option value="gain">增肌</option>
              <option value="maintain">维持健康</option>
            </select>
          </div>

          {profile.gender === "female" && (
            <div className="pn-field">
              <label>生理周期第几天（可选）</label>
              <input type="number" placeholder="1-28" value={profile.cycleDay || ""} onChange={e => update("cycleDay", +e.target.value || undefined)} />
            </div>
          )}

          <div className="pn-field pn-field-wide">
            <label>饮食偏好（如素食/低碳/地中海）</label>
            <input type="text" value={profile.diet} onChange={e => update("diet", e.target.value)} placeholder="例如：地中海饮食" />
          </div>

          <div className="pn-field pn-field-wide">
            <label>忌口 / 过敏</label>
            <input type="text" value={profile.restrictions} onChange={e => update("restrictions", e.target.value)} placeholder="例如：海鲜过敏、不吃牛肉" />
          </div>

          <div className="pn-field pn-field-wide">
            <label>健康状况（如糖尿病/高血压，可选）</label>
            <input type="text" value={profile.conditions} onChange={e => update("conditions", e.target.value)} placeholder="例如：轻度贫血" />
          </div>
        </div>

        <button className="pn-generate-btn" onClick={generate}>
          ✨ 生成我的明星营养方案
        </button>
      </div>
    );
  }

  if (step === "loading" || !plan) {
    return (
      <div className="pn-loading">
        <div className="pn-spinner" />
        <p>正在为你定制专属营养方案…</p>
        <div className="pn-loading-steps">
          <span>✓ 分析代谢</span>
          <span>✓ 计算宏量</span>
          <span>✓ 生成周方案</span>
          <span>✓ 补剂建议</span>
        </div>
      </div>
    );
  }

  // Result
  const days = Object.keys(plan.weeklyPlan);

  return (
    <div className="pn-result">
      {/* Summary + Macros */}
      <div className="pn-summary-card">
        <div className="pn-summary-left">
          <h2>🥗 {plan.summary}</h2>
          <div className="pn-principles">
            {plan.principles.map((p, i) => <span key={i} className="pn-chip">💡 {p}</span>)}
          </div>
        </div>
        <div className="pn-macros">
          <div className="pn-macro">
            <span className="pn-macro-val">{plan.macros.calories}</span>
            <span className="pn-macro-label">kcal/日</span>
          </div>
          <div className="pn-macro">
            <span className="pn-macro-val">{plan.macros.protein}g</span>
            <span className="pn-macro-label">蛋白质</span>
          </div>
          <div className="pn-macro">
            <span className="pn-macro-val">{plan.macros.carbs}g</span>
            <span className="pn-macro-label">碳水</span>
          </div>
          <div className="pn-macro">
            <span className="pn-macro-val">{plan.macros.fat}g</span>
            <span className="pn-macro-label">脂肪</span>
          </div>
        </div>
      </div>

      <div className="pn-grid">
        {/* Weekly Plan */}
        <div className="pn-card pn-week">
          <h3>📅 一周饮食方案</h3>
          <div className="pn-day-tabs">
            {days.map(d => (
              <button key={d} className={selectedDay === d ? "active" : ""} onClick={() => setSelectedDay(d)}>{d.replace("周", "")}</button>
            ))}
          </div>
          <div className="pn-day-meals">
            {Object.entries(plan.weeklyPlan[selectedDay]).map(([meal, food]) => (
              <div key={meal} className="pn-meal">
                <span className="pn-meal-icon">{meal === "breakfast" ? "🌅" : meal === "lunch" ? "☀️" : meal === "dinner" ? "🌙" : "🍎"}</span>
                <div>
                  <strong>{meal === "breakfast" ? "早餐" : meal === "lunch" ? "午餐" : meal === "dinner" ? "晚餐" : "加餐"}</strong>
                  <p>{food}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="pn-right">
          <div className="pn-card">
            <h3>💊 补剂建议</h3>
            <ul className="pn-list">{plan.supplements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>

          <div className="pn-card">
            <h3>🔥 抗炎营养</h3>
            <ul className="pn-list">{plan.antiInflammatory.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>

          <div className="pn-card">
            <h3>✨ 美肌营养</h3>
            <ul className="pn-list">{plan.skinGlow.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>

          {plan.cycleNutrition && (
            <div className="pn-card pn-cycle">
              <h3>🌸 周期营养</h3>
              <p>{plan.cycleNutrition}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grocery + Event */}
      <div className="pn-bottom">
        <div className="pn-card">
          <h3>🛒 每周购物清单</h3>
          <div className="pn-grocery">
            {plan.groceryList.map((g, i) => <span key={i} className="pn-grocery-item">📦 {g}</span>)}
          </div>
        </div>

        <div className="pn-card pn-event">
          <h3>📸 特殊场合速塑</h3>
          <div className="pn-event-input">
            <input type="text" placeholder="如：周末拍摄/约会/面试" value={eventType} onChange={e => setEventType(e.target.value)} />
            <button onClick={handleEventPrep} disabled={eventLoading || !eventType}>
              {eventLoading ? "生成中…" : "生成方案"}
            </button>
          </div>
          {eventPlan && (
            <div className="pn-event-result">
              <p className="pn-event-goal">{eventPlan.goal}</p>
              {eventPlan.dailyTips?.map((t: string, i: number) => <p key={i}>📌 {t}</p>)}
              <div className="pn-event-tags">
                {eventPlan.avoid?.map((a: string, i: number) => <span key={i} className="pn-tag bad">🚫 {a}</span>)}
                {eventPlan.boost?.map((b: string, i: number) => <span key={i} className="pn-tag good">✅ {b}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="pn-restart" onClick={() => { setStep("form"); setPlan(null); }}>↻ 重新定制</button>
    </div>
  );
}
