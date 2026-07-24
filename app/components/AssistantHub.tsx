"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { callLLM } from "../agent/coachAgent.ts";
import { getLLMConfig, hasLLM } from "../agent/config";
import { generateDailyWellnessAdvice } from "../agent/tcmEngine.ts";
import { recommendState, buildEnergyPlan } from "../agent/energyStateEngine.ts";
import ModuleIntro from "./ModuleIntro";

type ModuleKey =
  | "train" | "video" | "posture" | "nutrition" | "doctor" | "image"
  | "plan" | "timeline" | "energy" | "library" | "diet" | "sleep" | "tcm"
  | "dashboard" | "history";

interface ModuleMeta {
  key: ModuleKey;
  label: string;
  icon: string;
  blurb: string;
  group: string;
}

const MODULES: ModuleMeta[] = [
  { key: "train", label: "实时训练", icon: "🎯", blurb: "摄像头实时纠正动作", group: "运动" },
  { key: "video", label: "视频分析", icon: "🎬", blurb: "上传视频逐帧评测", group: "运动" },
  { key: "posture", label: "体态评估", icon: "🧍", blurb: "头前倾/圆肩/骨盆", group: "运动" },
  { key: "plan", label: "训练计划", icon: "📋", blurb: "个性化周计划", group: "运动" },
  { key: "library", label: "动作库", icon: "📚", blurb: "200+ 标准动作", group: "运动" },
  { key: "timeline", label: "时间轴", icon: "⏱️", blurb: "训练日程甘特图", group: "运动" },
  { key: "nutrition", label: "私人营养", icon: "🥗", blurb: "明星级膳食方案", group: "生活" },
  { key: "diet", label: "饮食记录", icon: "🍱", blurb: "热量与营养追踪", group: "生活" },
  { key: "sleep", label: "睡眠", icon: "😴", blurb: "睡眠质量与恢复", group: "生活" },
  { key: "doctor", label: "私人医生", icon: "🩺", blurb: "体检与指标解读", group: "生活" },
  { key: "image", label: "形象管理", icon: "💄", blurb: "穿搭/妆容/变美", group: "生活" },
  { key: "tcm", label: "中医养生", icon: "🌿", blurb: "节气天气体质", group: "养生" },
  { key: "energy", label: "能量状态", icon: "🔋", blurb: "高能量/滋补调理", group: "养生" },
  { key: "dashboard", label: "数据面板", icon: "📊", blurb: "全景健康数据", group: "我的" },
  { key: "history", label: "训练记录", icon: "📁", blurb: "历史与趋势", group: "我的" },
];

interface ChatCard {
  type: "tcm" | "energy" | "snapshot" | "module";
  data?: any;
}

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  text: string;
  card?: ChatCard;
  launch?: ModuleKey;
  quick?: string[];
}

// ---------- 意图识别 ----------
function detectEngine(text: string): "tcm" | "energy" | null {
  const t = text.toLowerCase();
  if (/(养生|节气|中医|天气|体质|今天(吃|怎么|该)|怎么养|煲汤|进补)/.test(text)) return "tcm";
  if (/(能量|累|疲劳|透支|疲惫|没精神|休息|滋补|调理|状态差|精力)/.test(text)) return "energy";
  return null;
}

function detectModule(text: string): ModuleKey | null {
  const map: Array<[RegExp, ModuleKey]> = [
    [/体态|姿势|驼背|圆肩|骨盆|脊柱|高低肩/, "posture"],
    [/视频|录(像|制)|分析(我的)?动作/, "video"],
    [/训练|健身|练(一练|练)|动作纠正|深蹲|俯卧撑|开合跳|平板/, "train"],
    [/计划|安排|周(计划|课表)|训练表/, "plan"],
    [/动作库|动作大全|标准动作|找动作/, "library"],
    [/时间轴|日程|甘特|排期/, "timeline"],
    [/营养|吃(什么|怎么)|膳食|增肌|减脂|热量|蛋白/, "nutrition"],
    [/饮食|记录吃|今天吃了|卡路里/, "diet"],
    [/睡眠|失眠|睡不好|熬夜|多梦/, "sleep"],
    [/医生|体检|指标|化验|报告|筛查/, "doctor"],
    [/形象|穿搭|化妆|妆容|变美|瘦脸|肤色/, "image"],
    [/养生|节气|中医|天气/, "tcm"],
    [/能量|累|疲劳|休息|滋补/, "energy"],
    [/数据|面板|仪表盘|统计/, "dashboard"],
    [/记录|历史|过往|趋势/, "history"],
  ];
  for (const [re, key] of map) if (re.test(text)) return key;
  return null;
}

// 通用健康问答的启发式兜底
function heuristicAnswer(text: string): string {
  const t = text;
  if (/(减脂|减肥|瘦)/.test(t)) return "减脂的核心是「热量缺口 + 保肌」。建议：蛋白质吃到体重(kg)×1.6–2g，碳水放在训练前后，每周 3–4 次力量训练配合轻度有氧。需要我帮你生成一份膳食方案吗？";
  if (/(增肌|肌肉)/.test(t)) return "增肌要「渐进超负荷 + 充足蛋白质和睡眠」。大肌群每周练 2 次，单组做到 8–12 次力竭附近，每晚 7–9 小时睡眠很关键。我可以打开「私人营养」给你算具体份量。";
  if (/(膝盖|腰|关节|伤)/.test(t)) return "有不适的部位建议先规避相关动作，并在「实时训练」里标记规避区域，会自动切到安全动作。疼痛持续请优先看医生，不硬撑。";
  if (/(跑|有氧|心肺)/.test(t)) return "有氧建议每周 150 分钟中等强度（快走、慢跑、骑行均可），可拆成每次 30 分钟×5 天。配合力量训练效果最好。";
  return "我是你的私人健康管家，可以帮你练得更准、吃得更对、睡得更好、按节气养生。试试下面的「技能中心」，或直接告诉我你想解决什么，比如「帮我看看体态」「今天怎么养生」「我最近很累怎么调理」。";
}

export default function AssistantHub({ onLaunch }: { onLaunch: (k: ModuleKey | "settings") => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    // 首次进入：问候 + 今日健康快照
    const snap = buildSnapshot();
    setMessages([
      {
        id: idRef.current++,
        role: "assistant",
        text: "你好，我是为你一人订制的私人健康管家 👑 训练、营养、睡眠、中医养生、形象管理…… 全都由我一手调度。今天，想先从哪方面宠爱自己？",
        card: { type: "snapshot", data: snap },
        quick: ["今天怎么养生", "我最近很累怎么调理", "帮我看看体态", "给我做个训练计划"],
      },
    ]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const push = useCallback((m: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: idRef.current++ }]);
  }, []);

  // ---------- 引擎调用 ----------
  function buildSnapshot() {
    const tcm = generateDailyWellnessAdvice({}, {}, "balanced");
    const stateId = recommendState();
    const plan = buildEnergyPlan(stateId);
    return { tcm, energy: { stateId, plan } };
  }

  function tcmCard() {
    const adv = generateDailyWellnessAdvice({}, {}, "balanced");
    return {
      text: `已为你生成今日养生方案 🌿 当前节气「${adv.solarTerm.name}」，结合天气与平衡体质给出建议：`,
      card: { type: "tcm" as const, data: adv },
      launch: "tcm" as ModuleKey,
    };
  }

  function energyCard() {
    const stateId = recommendState();
    const plan = buildEnergyPlan(stateId);
    return {
      text: `根据你的状态，当前最适合进入「${plan.state.label}」模式 🔋 我整理了一份今日能量与健康处方：`,
      card: { type: "energy" as const, data: plan },
      launch: "energy" as ModuleKey,
    };
  }

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || thinking) return;
      // “前往设置”快捷指令直接跳转
      if (/前往设置|打开设置|设置页/.test(text)) {
        onLaunch("settings" as any);
        return;
      }
      setInput("");
      push({ role: "user", text });
      setThinking(true);

      // 1) 引擎类意图（内联富卡片）
      const eng = detectEngine(text);
      if (eng === "tcm") {
        const r = tcmCard();
        push({ role: "assistant", ...r, quick: ["打开完整养生功能", "我最近很累怎么调理"] });
        setThinking(false);
        return;
      }
      if (eng === "energy") {
        const r = energyCard();
        push({ role: "assistant", ...r, quick: ["打开完整能量功能", "今天怎么养生"] });
        setThinking(false);
        return;
      }

      // 2) 模块唤起意图
      const mod = detectModule(text);
      if (mod) {
        const meta = MODULES.find((m) => m.key === mod)!;
        push({
          role: "assistant",
          text: `好的，这就为你打开「${meta.label}」${meta.icon} —— ${meta.blurb}。点击下方按钮进入，或直接在这里继续问我。`,
          launch: mod,
          quick: ["今天怎么养生", "我最近很累怎么调理"],
        });
        setThinking(false);
        return;
      }

      // 3) 自由问答（LLM，无密钥走启发式）
      const cfg = getLLMConfig();
      const sys = [
        "你是 AIxcellentHealth 的私人健康管家，运行在用户浏览器端、隐私优先。",
        "你整合了实时训练、视频分析、体态评估、私人营养、私人医生、形象管理、训练计划、睡眠、中医节气养生、能量状态管理等能力。",
        "请用亲切、专业、可执行的中文回答，控制在一两句到一小段，不要长篇大论。涉及医疗时提醒以医生诊断为准。",
      ].join("\n");
      const history = messages
        .filter((m) => m.role === "user" || (m.role === "assistant" && !m.card))
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.text }));
      let reply: string | null = null;
      if (cfg && cfg.apiKey) {
        reply = await callLLM(
          [{ role: "system", content: sys }, ...history, { role: "user", content: text }],
          { ...cfg, timeoutMs: 8000 },
          undefined,
        );
      }
      if (!reply && !hasLLM()) {
        // 无 Key 时显示友好兜底提示
        push({
          role: "assistant",
          text: heuristicAnswer(text),
          quick: ["前往设置", "打开私人营养", "给我做个训练计划"],
        });
        setThinking(false);
        return;
      }
      push({
        role: "assistant",
        text: reply || heuristicAnswer(text),
        quick: reply ? ["今天怎么养生", "帮我看看体态"] : ["打开私人营养", "给我做个训练计划"],
      });
      setThinking(false);
    },
    [input, thinking, messages, push],
  );

  return (
    <main className="aix-hub">
      <ModuleIntro
        title="私享管家"
        what="和你的健康管家对话，获取个性化建议和模块导航"
        how={["直接输入你的问题或需求","管家结合你的数据给出建议","可让管家帮你打开指定功能"]}
        tip="需在设置中配置后启用完整对话"
      />
      <section className="aix-hero">
        <div className="aix-orb" aria-hidden>
          <span className="aix-orb-core" />
          <span className="aix-ring r1" />
          <span className="aix-ring r2" />
          <span className="aix-ring r3" />
        </div>
        <div className="aix-hero-copy">
          <span className="aix-eyebrow">PRIVATE · 专为你订制</span>
          <h1>专为你一人的<br />私人健康管家</h1>
          <p>不出门，即享高端私教、营养师、私人医生与形象顾问的同款服务。一切，只为你量身订制——直接告诉我你的目标，我来调度所有能力。</p>
          <div className="aix-hero-stats">
            <span><b>15</b> 项能力</span>
            <span><b>云端</b> 隐私</span>
            <span><b>智能</b> 编排</span>
          </div>
        </div>
      </section>

      <section className="aix-chat-wrap">
        <div className="aix-chat" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`aix-msg ${m.role}`}>
              {m.role === "assistant" && <div className="aix-avatar">✦</div>}
              <div className="aix-bubble-col">
                <div className="aix-bubble">{m.text}</div>
                {m.card && <CardView card={m.card} onLaunch={onLaunch} />}
                {m.launch && (
                  <button className="aix-launch" onClick={() => onLaunch(m.launch!)}>
                    打开「{MODULES.find((x) => x.key === m.launch)!.label}」 →
                  </button>
                )}
                {m.quick && (
                  <div className="aix-quick">
                    {m.quick.map((q) => (
                      <button key={q} className="aix-chip" onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="aix-msg assistant">
              <div className="aix-avatar">✦</div>
              <div className="aix-bubble-col">
                <div className="aix-bubble aix-typing"><i /><i /><i /></div>
              </div>
            </div>
          )}
        </div>

        <form className="aix-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="告诉我你的目标，例如：帮我看看体态、今天怎么养生、最近很累怎么调理…"
          />
          <button type="submit" disabled={thinking || !input.trim()}>发送</button>
        </form>
      </section>

      <section className="aix-skills">
        <div className="aix-skills-head">
          <span className="aix-eyebrow">专属服务</span>
          <h2>为你准备的专属服务</h2>
          <p>点击下方任意能力，或直接在上方对我说。我会记住你的上下文，把不同模块串成一套只属于你的方案。</p>
        </div>
        <div className="aix-skill-grid">
          {MODULES.map((m) => (
            <button key={m.key} className="aix-skill" onClick={() => onLaunch(m.key)}>
              <span className="aix-skill-ic">{m.icon}</span>
              <span className="aix-skill-label">{m.label}</span>
              <span className="aix-skill-blurb">{m.blurb}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

// ---------- 内联富卡片 ----------
function CardView({ card, onLaunch }: { card: ChatCard; onLaunch: (k: ModuleKey) => void }) {
  if (card.type === "tcm") {
    const d = card.data;
    return (
      <div className="aix-card aix-card-tcm">
        <div className="aix-card-head">
          <span>🌿 今日养生 · {d.solarTerm.name}</span>
          <small>{d.date} · {d.location}</small>
        </div>
        <p className="aix-card-principle">{d.solarTerm.principle}</p>
        <div className="aix-card-rows">
          <div><b>🍲 推荐食材</b><span>{d.solarTerm.recommendedDiet}</span></div>
          <div><b>🏃 推荐运动</b><span>{d.solarTerm.recommendedExercise}</span></div>
          <div><b>⚠️ 宜忌</b><span>{d.solarTerm.avoid}</span></div>
        </div>
        <ul className="aix-tips">
          {d.todayTips.slice(0, 4).map((t: string, i: number) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    );
  }
  if (card.type === "energy") {
    const p = card.data;
    const nowActions = p.actions.filter((a: any) => a.isNow).slice(0, 3);
    return (
      <div className="aix-card aix-card-energy">
        <div className="aix-card-head">
          <span>{p.state.icon} 当前模式 · {p.state.label}</span>
          <small>{p.context.timeSlot} · {p.context.isWeekend ? "周末" : "工作日"}</small>
        </div>
        <p className="aix-card-principle">{p.state.desc}</p>
        <div className="aix-card-rows">
          <div><b>🌿 中医调理</b><span>{p.tcm.diet} · 穴位：{p.tcm.acupoints}</span></div>
          <div><b>⚡ 高能要点</b><span>{p.highEnergy}</span></div>
          <div><b>🛌 滋补要点</b><span>{p.nourish}</span></div>
        </div>
        {nowActions.length > 0 && (
          <div className="aix-now">
            <small>此刻就能做：</small>
            {nowActions.map((a: any, i: number) => (
              <span key={i} className="aix-now-item">· {a.text}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (card.type === "snapshot") {
    const d = card.data;
    return (
      <div className="aix-card aix-card-snap">
        <div className="aix-snap-row">
          <div className="aix-snap-item">
            <span>🌿 今日节气</span><strong>{d.tcm.solarTerm.name}</strong>
            <em>{d.tcm.solarTerm.principle}</em>
          </div>
          <div className="aix-snap-item">
            <span>{d.energy.plan.state.icon} 能量模式</span>
            <strong>{d.energy.plan.state.label}</strong>
            <em>{d.energy.plan.context.timeSlot}</em>
          </div>
        </div>
        <p className="aix-snap-foot">已为你串联训练 · 营养 · 睡眠 · 养生 · 形象等 15 项能力。直接说需求，我来调度。</p>
      </div>
    );
  }
  return null;
}
