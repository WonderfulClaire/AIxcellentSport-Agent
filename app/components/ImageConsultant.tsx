"use client";

import { useState, useCallback } from "react";
import {
  COLOR_QUESTIONS,
  diagnoseSeason,
  BODY_SHAPES,
  diagnoseBodyShape,
  generateImagePlan,
} from "../agent/imageConsultant.ts";
import { callLLM } from "../agent/coachAgent.ts";
import { getLLMConfig, hasLLM } from "../agent/config";
import { buildHealthContext } from "../agent/context";
import { loadAgentConfig } from "../agent/index.ts";
import ModuleIntro from "./ModuleIntro";

// ---------- 无 Key 提示卡片 ----------
function NoKeyBanner() {
  return (
    <div className="aix-nokey-card" style={{ margin: "0 0 1rem" }}>
      <div className="aix-nokey-icon">✦</div>
      <p>配置智能对话服务后可获得更个性化的形象建议。</p>
      <p className="aix-nokey-sub">当前使用规则引擎生成方案，前往「设置」填写配置即可升级为智能形象顾问。</p>
    </div>
  );
}

// ---------- 形象问答 Chat ----------
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function ImageChat({ profile }: { profile: any }) {
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMsgs((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);

    try {
      const cfg = getLLMConfig();
      if (!cfg) {
        setChatMsgs((prev) => [...prev, { role: "assistant", text: "未配置智能对话服务，请前往设置页填写配置。" }]);
        setChatLoading(false);
        return;
      }

      const profileCtx = [
        `用户信息：性别${profile.gender === "female" ? "女" : "男"}，${profile.age}岁`,
        profile.style ? `风格偏好：${profile.style}` : "",
        profile.concern ? `主要诉求：${profile.concern}` : "",
        profile.occasion ? `常见场合：${profile.occasion}` : "",
      ].filter(Boolean).join("，");

      const sys = [
        "你是用户的私享形象顾问，精通色彩搭配、服装风格、妆容设计和气质提升。",
        "基于用户的体型、肤色和偏好，给出专业、可执行的形象建议。",
        "回答亲切专业，控制在 3-5 句。",
        profileCtx,
      ].join("\n");

      const history = chatMsgs.slice(-6).map((m) => ({ role: m.role, content: m.text }));
      const reply = await callLLM(
        [{ role: "system", content: sys }, ...history, { role: "user", content: text }],
        { ...cfg, timeoutMs: 10000 },
        undefined,
      );

      if (reply) {
        setChatMsgs((prev) => [...prev, { role: "assistant", text: reply }]);
      } else {
        setChatMsgs((prev) => [...prev, { role: "assistant", text: "连接失败，请检查配置或稍后重试。你可以先使用下方的问卷诊断功能。" }]);
      }
    } catch {
      setChatMsgs((prev) => [...prev, { role: "assistant", text: "服务暂时不可用，请稍后重试。" }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, chatMsgs, profile]);

  return (
    <div className="hc-chat">
      <h3>💬 形象咨询</h3>
      <p className="hc-chat-hint">关于穿搭、配色、妆容、气质的问题，直接问我。</p>
      <div className="hc-chat-messages">
        {chatMsgs.map((m, i) => (
          <div key={i} className={`hc-chat-msg hc-chat-${m.role}`}>
            {m.role === "assistant" && <span className="hc-chat-avatar">✦</span>}
            <span className="hc-chat-text">{m.text}</span>
          </div>
        ))}
        {chatLoading && <div className="hc-chat-msg hc-chat-assistant"><span className="hc-chat-avatar">✦</span><span className="hc-chat-text">思考中…</span></div>}
      </div>
      <form className="hc-chat-form" onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="问我穿搭建议，例如：职场面试穿什么好？"
        />
        <button type="submit" disabled={chatLoading || !chatInput.trim()}>发送</button>
      </form>
    </div>
  );
}

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
    const result = await generateImagePlan(profile);
    setPlan(result);
    setStep("result");
  }, [profile]);

  const llmAvailable = hasLLM();

  if (step === "form") {
    const answeredCount = Object.keys(profile.colorAnswers).length;
    return (
      <div className="ic-form">
        <ModuleIntro
          title="形象顾问"
          what="根据你的体型和风格偏好，提供穿搭和形象建议"
          how={["上传一张全身照或描述你的需求","获取配色和穿搭建议","查看适合你的风格方案"]}
        />
        <div className="ic-header">
          <h2>💄 你的私人形象顾问</h2>
          <p>明星造型师同款诊断，找到最衬你的色彩与风格</p>
        </div>

        {/* 智能问答区 */}
        {llmAvailable && <ImageChat profile={profile} />}
        {!llmAvailable && <NoKeyBanner />}

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
          <h3>�� 扬长避短</h3>
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
