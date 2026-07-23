"use client";

import { useState, useCallback } from "react";
import {
  COLOR_QUESTIONS,
  diagnoseSeason,
  BODY_SHAPES,
  diagnoseBodyShape,
  generateImagePlan,
} from "../agent/imageConsultant.js";
import { loadAgentConfig } from "../agent/index.js";

export default function ImageConsultant() {
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [profile, setProfile] = useState({
    gender: "female", age: 28, style: "", concern: "", occasion: "",
    colorAnswers: {} as Record<string, string>,
    shoulders: "balanced", waist: "defined", hips: "balanced",
  });
  const [season, setSeason] = useState<any>(null);
  const [body, setBody] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  const update = (k: string, v: any) => setProfile(p => ({ ...p, [k]: v }));

  const answerColor = (qid: string, v: string) => {
    setProfile(p => ({ ...p, colorAnswers: { ...p.colorAnswers, [qid]: v } }));
  };

  const analyze = useCallback(async () => {
    setStep("loading");
    setSeason(diagnoseSeason(profile.colorAnswers));
    setBody(diagnoseBodyShape(profile.shoulders, profile.waist, profile.hips));

    const config = loadAgentConfig();
    let result;
    if (config?.apiKey) {
      result = await generateImagePlan(profile);
    } else {
      result = await generateImagePlan(profile);
    }
    setPlan(result);
    setStep("result");
  }, [profile]);

  if (step === "form") {
    const answeredCount = Object.keys(profile.colorAnswers).length;
    return (
      <div className="ic-form">
        <div className="ic-header">
          <h2>💄 你的私人形象顾问</h2>
          <p>明星造型师同款诊断，找到最衬你的色彩与风格</p>
        </div>

        {/* 基础信息 */}
        <div className="ic-section">
          <h3>① 基本信息</h3>
          <div className="ic-grid">
            <div className="ic-field">
              <label>性别</label>
              <div className="ic-toggle">
                <button className={profile.gender === "female" ? "active" : ""} onClick={() => update("gender", "female")}>女</button>
                <button className={profile.gender === "male" ? "active" : ""} onClick={() => update("gender", "male")}>男</button>
              </div>
            </div>
            <div className="ic-field">
              <label>年龄</label>
              <input type="number" value={profile.age} onChange={e => update("age", +e.target.value)} />
            </div>
            <div className="ic-field">
              <label>风格偏好</label>
              <input type="text" value={profile.style} onChange={e => update("style", e.target.value)} placeholder="如：韩系/通勤/休闲" />
            </div>
            <div className="ic-field">
              <label>主要诉求</label>
              <input type="text" value={profile.concern} onChange={e => update("concern", e.target.value)} placeholder="如：显脸小/更上镜" />
            </div>
            <div className="ic-field ic-wide">
              <label>常需场合</label>
              <input type="text" value={profile.occasion} onChange={e => update("occasion", e.target.value)} placeholder="如：职场/约会/日常" />
            </div>
          </div>
        </div>

        {/* 色彩诊断 */}
        <div className="ic-section">
          <h3>② 色彩诊断（四季色彩法）</h3>
          {COLOR_QUESTIONS.map(q => (
            <div key={q.id} className="ic-question">
              <p>{q.q}</p>
              <div className="ic-options">
                {q.options.map(o => (
                  <button key={o.v}
                    className={profile.colorAnswers[q.id] === o.v ? "active" : ""}
                    onClick={() => answerColor(q.id, o.v)}>
                    {o.t}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="ic-hint">已答 {answeredCount}/4 — 全部回答诊断更准</p>
        </div>

        {/* 身型分析 */}
        <div className="ic-section">
          <h3>③ 身型分析</h3>
          <div className="ic-grid">
            <div className="ic-field">
              <label>肩部</label>
              <select value={profile.shoulders} onChange={e => update("shoulders", e.target.value)}>
                <option value="wider">比臀宽</option>
                <option value="balanced">与臀等宽</option>
                <option value="narrower">比臀窄</option>
              </select>
            </div>
            <div className="ic-field">
              <label>腰部</label>
              <select value={profile.waist} onChange={e => update("waist", e.target.value)}>
                <option value="defined">明显有腰</option>
                <option value="round">圆润丰满</option>
                <option value="straight">较直</option>
              </select>
            </div>
            <div className="ic-field">
              <label>臀部</label>
              <select value={profile.hips} onChange={e => update("hips", e.target.value)}>
                <option value="wider">比肩宽</option>
                <option value="balanced">与肩等宽</option>
                <option value="narrower">比肩窄</option>
              </select>
            </div>
          </div>
        </div>

        <button className="ic-btn" onClick={analyze} disabled={answeredCount < 4}>
          {answeredCount < 4 ? "请完成色彩诊断(4题)" : "✨ 生成我的形象方案"}
        </button>
      </div>
    );
  }

  if (step === "loading" || !plan) {
    return (
      <div className="ic-loading">
        <div className="ic-spinner" />
        <p>正在为你诊断色彩与身型，定制形象方案…</p>
      </div>
    );
  }

  return (
    <div className="ic-result">
      <div className="ic-diagnosis">
        <div className="ic-diag-card">
          <span className="ic-diag-icon">🎨</span>
          <div>
            <h4>{season.name}</h4>
            <p>{season.traits}</p>
          </div>
        </div>
        <div className="ic-diag-card">
          <span className="ic-diag-icon">👗</span>
          <div>
            <h4>{body.name}</h4>
            <p>{body.traits}</p>
          </div>
        </div>
      </div>

      <div className="ic-summary">
        <h2>💄 {plan.summary}</h2>
      </div>

      <div className="ic-grid-2">
        {/* 色彩 */}
        <div className="ic-card">
          <h3>🎨 专属色板</h3>
          <p className="ic-sub">{plan.colorAdvice}</p>
          <div className="ic-color-tags">
            {season.colors.map((c: string, i: number) => <span key={i} className="ic-color-tag">{c}</span>)}
          </div>
          <h5>💄 妆容色</h5>
          <div className="ic-color-tags">
            {season.makeup.map((c: string, i: number) => <span key={i} className="ic-makeup-tag">{c}</span>)}
          </div>
          <h5>🚫 慎选</h5>
          <div className="ic-color-tags">
            {season.avoid.map((c: string, i: number) => <span key={i} className="ic-avoid-tag">{c}</span>)}
          </div>
        </div>

        {/* 身型穿搭 */}
        <div className="ic-card">
          <h3>👗 扬长避短</h3>
          <div className="ic-do-avoid">
            <div className="ic-do">
              <h5>✅ 穿</h5>
              <ul>{body.do.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
            </div>
            <div className="ic-avoid">
              <h5>⛔ 避</h5>
              <ul>{body.avoid.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
            </div>
          </div>
          <h5>📐 通用原则</h5>
          <ul className="ic-list">{plan.bodyAdvice.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
        </div>
      </div>

      {/* 场合造型 */}
      <div className="ic-card">
        <h3>🎭 场合造型指南</h3>
        <div className="ic-occasion-grid">
          {Object.entries(plan.occasionStyling).map(([k, v]) => (
            <div key={k} className="ic-occasion">
              <span className="ic-occasion-name">{k}</span>
              <p>{v as string}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ic-grid-2">
        {/* 胶囊衣橱 */}
        <div className="ic-card">
          <h3>🧥 胶囊衣橱必备</h3>
          <div className="ic-capsule">
            {plan.capsuleWardrobe.map((c: string, i: number) => <span key={i} className="ic-capsule-item">👕 {c}</span>)}
          </div>
        </div>

        {/* 妆容 */}
        <div className="ic-card">
          <h3>💋 日常妆容流程</h3>
          <ol className="ic-makeup-steps">
            {plan.makeupRoutine.map((m: string, i: number) => <li key={i}>{m}</li>)}
          </ol>
        </div>
      </div>

      {/* 健身变美 */}
      <div className="ic-card">
        <h3>💪 健身变美</h3>
        <div className="ic-beauty">
          {plan.beautyFitness.map((b: string, i: number) => (
            <div key={i} className="ic-beauty-item">✨ {b}</div>
          ))}
        </div>
      </div>

      <div className="ic-grid-2">
        <div className="ic-card">
          <h3>🌟 气质提升</h3>
          <ul className="ic-list">{plan.confidenceTips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
        </div>
        <div className="ic-card ic-quick">
          <h3>⚡ 立竿见影</h3>
          <ul className="ic-list">{plan.quickWins.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
        </div>
      </div>

      <button className="ic-restart" onClick={() => { setStep("form"); setPlan(null); setSeason(null); setBody(null); }}>↻ 重新诊断</button>
    </div>
  );
}
