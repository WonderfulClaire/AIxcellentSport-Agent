"use client";

import { useState, useCallback } from "react";
import {
  BIOMARKERS,
  evaluateMarker,
  getScreeningSchedule,
  HEALTH_PHASES,
  RED_FLAGS,
  generateHealthReport,
} from "../agent/healthConcierge.js";
import { loadAgentConfig } from "../agent/index.js";

type Profile = {
  gender: "male" | "female";
  age: number;
  habits: string;
  history: string;
  goal: string;
};

export default function HealthConcierge() {
  const [step, setStep] = useState<"form" | "input" | "loading" | "result">("form");
  const [profile, setProfile] = useState<Profile>({
    gender: "female", age: 30, habits: "", history: "", goal: "长期健康与长寿",
  });
  const [markers, setMarkers] = useState<Record<string, number>>({});
  const [report, setReport] = useState<any>(null);
  const [screenings, setScreenings] = useState<any[]>([]);

  const update = (k: keyof Profile, v: any) => setProfile(p => ({ ...p, [k]: v }));

  const toInput = useCallback(() => {
    setScreenings(getScreeningSchedule(profile));
    setStep("input");
  }, [profile]);

  const generate = useCallback(async () => {
    setStep("loading");
    const config = loadAgentConfig();
    let result;
    if (config?.apiKey) {
      result = await generateHealthReport(profile, markers, screenings);
    } else {
      result = await generateHealthReport(profile, markers, screenings);
    }
    setReport(result);
    setStep("result");
  }, [profile, markers, screenings]);

  const setMarker = (key: string, val: string) => {
    const n = parseFloat(val);
    setMarkers(m => ({ ...m, [key]: isNaN(n) ? undefined as any : n }));
  };

  if (step === "form") {
    return (
      <div className="hc-form">
        <div className="hc-header">
          <h2>🩺 你的私人保健医生</h2>
          <p>亿万富豪级的主动健康管理，现在你也有了</p>
        </div>
        <div className="hc-form-grid">
          <div className="hc-field">
            <label>性别</label>
            <div className="hc-toggle">
              <button className={profile.gender === "female" ? "active" : ""} onClick={() => update("gender", "female")}>女</button>
              <button className={profile.gender === "male" ? "active" : ""} onClick={() => update("gender", "male")}>男</button>
            </div>
          </div>
          <div className="hc-field">
            <label>年龄</label>
            <input type="number" value={profile.age} onChange={e => update("age", +e.target.value)} />
          </div>
          <div className="hc-field hc-wide">
            <label>生活习惯（吸烟/饮酒/运动/睡眠）</label>
            <input type="text" value={profile.habits} onChange={e => update("habits", e.target.value)} placeholder="如：偶尔饮酒，每周运动3次，睡眠6h" />
          </div>
          <div className="hc-field hc-wide">
            <label>病史 / 家族史</label>
            <input type="text" value={profile.history} onChange={e => update("history", e.target.value)} placeholder="如：父亲有高血压，本人无慢性病" />
          </div>
          <div className="hc-field hc-wide">
            <label>健康目标</label>
            <input type="text" value={profile.goal} onChange={e => update("goal", e.target.value)} placeholder="如：希望精力充沛、延缓衰老" />
          </div>
        </div>
        <button className="hc-btn" onClick={toInput}>下一步：录入体检数据 →</button>
      </div>
    );
  }

  if (step === "input") {
    const categories = [...new Set(Object.values(BIOMARKERS).map(b => b.category))];
    return (
      <div className="hc-input">
        <div className="hc-header">
          <h2>📋 录入你的体检数据</h2>
          <p>填多少算多少，AI 会据此评估风险趋势（数据仅存本地）</p>
        </div>

        <div className="hc-screenings">
          <h3>📅 你的预防筛查时间表</h3>
          <div className="hc-screen-grid">
            {screenings.map((s, i) => (
              <div key={i} className="hc-screen-item">
                <span className="hc-screen-name">{s.name}</span>
                <span className="hc-screen-freq">{s.freq}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hc-markers">
          {categories.map(cat => (
            <div key={cat} className="hc-cat">
              <h4>{cat}</h4>
              <div className="hc-marker-grid">
                {Object.entries(BIOMARKERS).filter(([, b]) => b.category === cat).map(([key, def]) => {
                  const val = markers[key];
                  const evalRes = val != null ? evaluateMarker(key, val) : null;
                  return (
                    <div key={key} className="hc-marker">
                      <label>{def.name} <small>({def.unit})</small></label>
                      <div className="hc-marker-input">
                        <input type="number" step="0.01" placeholder={`${def.optimal[0]}-${def.optimal[1]}`}
                          value={val ?? ""} onChange={e => setMarker(key, e.target.value)} />
                        {evalRes && (
                          <span className="hc-marker-status" style={{ color: evalRes.color }}>
                            {evalRes.msg}
                          </span>
                        )}
                      </div>
                      <small className="hc-ref">理想: {def.optimal[0]}-{def.optimal[1]} {def.unit}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="hc-actions">
          <button className="hc-btn-secondary" onClick={() => setStep("form")}>← 返回</button>
          <button className="hc-btn" onClick={generate}>✨ 生成健康管家报告</button>
        </div>
      </div>
    );
  }

  if (step === "loading" || !report) {
    return (
      <div className="hc-loading">
        <div className="hc-spinner" />
        <p>正在分析你的生物标志物并制定健康策略…</p>
      </div>
    );
  }

  // Result
  const statusCounts = report.evaluated.reduce((acc: any, e: any) => {
    acc[e.status] = (acc[e.status] || 0) + 1; return acc;
  }, {});

  return (
    <div className="hc-result">
      <div className="hc-summary-card">
        <div>
          <h2>🩺 {report.overview}</h2>
          <p className="hc-risk">{report.riskSummary}</p>
        </div>
        <div className="hc-status-pills">
          <span className="hc-pill optimal">理想 {statusCounts.optimal || 0}</span>
          <span className="hc-pill warning">关注 {statusCounts.warning || 0}</span>
          <span className="hc-pill danger">异常 {statusCounts.danger || 0}</span>
        </div>
      </div>

      {report.priorities?.length > 0 && (
        <div className="hc-card">
          <h3>🎯 优先关注</h3>
          <ul>{report.priorities.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}

      {/* 阶段式健康计划 */}
      <div className="hc-phases">
        {HEALTH_PHASES.map(phase => (
          <div key={phase.key} className="hc-phase-card">
            <div className="hc-phase-head">
              <span className="hc-phase-icon">{phase.icon}</span>
              <h4>{phase.name}</h4>
            </div>
            <p className="hc-phase-desc">{phase.desc}</p>
            <ul>
              {(report.phasePlan?.[phase.key] || phase.actions).map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="hc-grid">
        <div className="hc-card">
          <h3>♾️ 长寿医学建议</h3>
          <ul>{report.longevity?.map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
        </div>
        <div className="hc-card">
          <h3>💊 生活方式处方</h3>
          <ul>{report.lifestyleRx?.map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
        </div>
      </div>

      <div className="hc-card">
        <h3>🔬 指标追踪建议</h3>
        <p>{report.monitoring}</p>
      </div>

      {/* 就医红线 */}
      <div className="hc-redflags">
        <h3>🚨 就医红线 — 出现以下情况立即就医</h3>
        <div className="hc-redflag-grid">
          {RED_FLAGS.map((rf, i) => (
            <div key={i} className={`hc-redflag ${rf.urgent ? "urgent" : ""}`}>
              <span className="hc-rf-symptom">⚠️ {rf.symptom}</span>
              <span className="hc-rf-action">{rf.action}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="hc-restart" onClick={() => { setStep("form"); setReport(null); setMarkers({}); }}>↻ 重新评估</button>
    </div>
  );
}
