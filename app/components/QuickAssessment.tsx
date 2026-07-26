"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getProfile, saveProfile } from "../healthStore";

/* ───────────────────────────────────────────────────────────
 * 3 分钟私人健康评估
 * 渐进式问卷：一次一题，带进度条 + 实时健康指数预览。
 * 全程纯前端打分（确定性启发式），无需联网 / 登录即可完成；
 * 结束即把结果写入本地档案，并把「你的结果」接回 App 的真实功能模块。
 *
 * 额外彩蛋：根据答案生成「健康人格卡」（MBTI / SBTI 式趣味人设），
 * 可一键分享文案 / 保存为图片，满足年轻人的身份认同与社交传播。
 * ─────────────────────────────────────────────────────────── */

interface Option {
  label: string;
  score: number; // 0~3，越高越好
  advice?: string; // 该选项命中「待改善」时给出的个性化建议
}
interface Question {
  id: string;
  group: string; // 维度：用于画像与风险聚合
  q: string;
  hint?: string;
  options: Option[];
}

const GOAL_MAP: Record<string, string[]> = {
  减脂塑形: ["减脂", "塑形"],
  增肌力量: ["增肌", "力量"],
  改善体态: ["改善体态", "缓解酸痛"],
  提升精力: ["提升精力", "改善睡眠"],
};

const QUESTIONS: Question[] = [
  {
    id: "exercise_freq",
    group: "运动活力",
    q: "你平均每周主动运动（出汗 / 心率明显提升）几次？",
    hint: "主动运动指快走、跑步、力量、球类等，不含通勤走路。",
    options: [
      { label: "几乎不运动", score: 0, advice: "从每周 2 次、每次 20 分钟快走开始，比偶尔猛练更可持续。" },
      { label: "1–2 次", score: 1, advice: "每周再加 1 次，把频率稳定在 3 次，身体会明显回应你。" },
      { label: "3–4 次", score: 2 },
      { label: "5 次及以上", score: 3 },
    ],
  },
  {
    id: "intensity",
    group: "运动活力",
    q: "一次运动你通常能坚持多久？",
    options: [
      { label: "少于 15 分钟", score: 0, advice: "把单次时长拉到 30 分钟，配合热身与拉伸，效果翻倍。" },
      { label: "15–30 分钟", score: 1, advice: "试着每次多坚持 10 分钟，进入有氧燃脂区间。" },
      { label: "30–45 分钟", score: 2 },
      { label: "45 分钟以上", score: 3 },
    ],
  },
  {
    id: "sleep_hours",
    group: "睡眠恢复",
    q: "你平均每晚睡多久？",
    options: [
      { label: "少于 5 小时", score: 0, advice: "优先保证 7 小时睡眠——它是减脂、恢复与情绪的地基。" },
      { label: "5–6 小时", score: 1, advice: "早点睡 30 分钟，先把睡眠补到 6.5 小时以上。" },
      { label: "6–7 小时", score: 2 },
      { label: "7–9 小时", score: 3 },
    ],
  },
  {
    id: "sleep_quality",
    group: "睡眠恢复",
    q: "睡醒后的感觉通常是？",
    options: [
      { label: "总是很累，像没睡", score: 0, advice: "睡前 1 小时远离屏幕、固定作息，能显著改善睡醒疲惫。" },
      { label: "经常犯困", score: 1, advice: "固定起床时间比固定入睡时间更关键，先从这里入手。" },
      { label: "多数时候还行", score: 2 },
      { label: "神清气爽", score: 3 },
    ],
  },
  {
    id: "stress",
    group: "压力情绪",
    q: "过去一个月，你的压力水平如何？",
    options: [
      { label: "长期高压，常焦虑", score: 0, advice: "每天 5 分钟呼吸 / 冥想，是降低皮质醇、保护代谢的低成本杠杆。" },
      { label: "经常紧绷", score: 1, advice: "给每天留一段「无通知」时间，让神经系统真正降档。" },
      { label: "偶尔有压力", score: 2 },
      { label: "总体轻松", score: 3 },
    ],
  },
  {
    id: "mood",
    group: "压力情绪",
    q: "你的情绪状态更像？",
    options: [
      { label: "容易暴躁 / 低落", score: 0, advice: "规律运动本身是最强的天然情绪调节剂，从今天动起来。" },
      { label: "不太稳定", score: 1, advice: "睡眠与运动双管齐下，情绪稳定性会随之提升。" },
      { label: "比较平稳", score: 2 },
      { label: "乐观积极", score: 3 },
    ],
  },
  {
    id: "diet_regular",
    group: "饮食营养",
    q: "你的三餐规律吗？",
    options: [
      { label: "经常漏餐 / 暴饮", score: 0, advice: "先做到三餐定时、早餐不断，比纠结吃什么更重要。" },
      { label: "不太规律", score: 1, advice: "提前备餐一餐（如早餐），就能把规律度拉起来。" },
      { label: "基本规律", score: 2 },
      { label: "很规律，注重搭配", score: 3 },
    ],
  },
  {
    id: "water",
    group: "饮食营养",
    q: "你每天喝水（白水）大概多少？",
    options: [
      { label: "很少，常喝含糖饮料", score: 0, advice: "把一杯含糖饮料换成一杯水，每天 6–8 杯，代谢会更顺。" },
      { label: "1–3 杯", score: 1, advice: "在工位放一瓶水，提醒自己每小时喝几口。" },
      { label: "4–6 杯", score: 2 },
      { label: "7 杯以上", score: 3 },
    ],
  },
  {
    id: "pain",
    group: "体态酸痛",
    q: "你常有身体酸痛 / 不适吗？",
    options: [
      { label: "几乎每天", score: 0, advice: "你适合从低冲击训练 + 针对性拉伸 / 筋膜放松入手，避免带伤硬练。" },
      { label: "经常（≥3 次 / 周）", score: 1, advice: "先做体态评估，找出酸痛源头再对症下药。" },
      { label: "偶尔", score: 2 },
      { label: "很少", score: 3 },
    ],
  },
  {
    id: "sit",
    group: "体态酸痛",
    q: "你每天久坐（看屏）大约多久？",
    options: [
      { label: "10 小时以上", score: 0, advice: "每坐 45 分钟起身 3 分钟，能缓解久坐带来的腰颈酸痛。" },
      { label: "7–10 小时", score: 1, advice: "用站立办公或定时提醒，打断久坐链条。" },
      { label: "4–7 小时", score: 2 },
      { label: "少于 4 小时", score: 3 },
    ],
  },
  {
    id: "goal",
    group: "目标动力",
    q: "你最想优先改善的是？（决定后续方案方向）",
    options: [
      { label: "减脂塑形", score: 2 },
      { label: "增肌 / 力量", score: 2 },
      { label: "改善体态 / 酸痛", score: 2 },
      { label: "提升精力 / 睡眠", score: 2 },
    ],
  },
  {
    id: "motivation",
    group: "目标动力",
    q: "你为健康付出的意愿是？",
    options: [
      { label: "想动但总没时间", score: 0, advice: "别靠意志力，让管家把计划拆成每天 15 分钟的小任务。" },
      { label: "需要有人带着做", score: 1, advice: "开启「每日陪伴」模式，管家会主动提醒并陪你打卡。" },
      { label: "愿意每天花 20 分钟", score: 2 },
      { label: "已养成习惯，想更专业", score: 3 },
    ],
  },
];

const MAX_PER = 3;
const TOTAL_MAX = QUESTIONS.length * MAX_PER;

function portrait(index: number): { label: string; desc: string } {
  if (index >= 80) return { label: "自律标杆", desc: "你的生活习惯已经很优秀，重点在精细化与突破平台期。" };
  if (index >= 60) return { label: "稳健潜力", desc: "底子不错，在 1–2 个维度上再推一把就能跃迁。" };
  if (index >= 40) return { label: "待激活", desc: "你具备改变的基础，但运动 / 睡眠 / 饮食还有明显空间。" };
  return { label: "急需重启", desc: "身体在提醒你：从今天一个小动作开始，比完美计划更重要。" };
}

/* ───────────────────────────────────────────────────────────
 * 健康人格系统（MBTI / SBTI 式趣味人设）
 * 4 个维度 → 4 字母代号 → 16 种人格，每种都有名字 / emoji / 标语 / 特质
 * ─────────────────────────────────────────────────────────── */
interface Persona {
  code: string; // 4 字母，如 DEVG
  letters: string[];
  axisLabels: string[]; // 所选两极的中文标签
  axisEnLabels: string[]; // 所选两极的英文原词（MBTI 式）
  name: string;
  emoji: string;
  tagline: string;
  traits: string[];
  desc: string;
  flavor: string; // 结合用户目标生成的个性化短语
}

// 单一人格的定义（不含运行时字段）
interface PersonaDef {
  name: string;
  emoji: string;
  tagline: string;
  traits: string[];
  desc: string;
}

const PERSONAS: Record<string, PersonaDef> = {
  DEVG: { name: "卷王养生体", emoji: "🏋️💎", tagline: "自律刻进 DNA，连睡觉都列计划表", traits: ["极致自律", "目标明确", "数据控"], desc: "你不是养生，你是在经营自己这台精密仪器。保持节奏，但别把恢复日也排满。" },
  DEVP: { name: "硬核玩乐家", emoji: "🔥🎮", tagline: "练得猛、玩得野，紧绷但超快乐", traits: ["精力爆棚", "爱挑战", "即时满足"], desc: "你靠高能量驱动生活，记得给身体留缓冲，别让「猛」变成「透支」。" },
  DESG: { name: "高效狠人", emoji: "🥋⚡", tagline: "没空矫情，靠自律硬扛一切", traits: ["执行力强", "不服输", "略紧绷"], desc: "你的武器是自律，但长期紧绷会偷走恢复。把「放松」也写进待办。" },
  DESP: { name: "极限体验派", emoji: "🎢🌶️", tagline: "爱刺激爱挑战，在紧绷里找快感", traits: ["追求爽感", "冒险派", "高肾上腺素"], desc: "你享受突破边界，但身体需要周期化休息，别让极限成为日常。" },
  DNVG: { name: "阳光行动派", emoji: "☀️🤸", tagline: "不纠结说干就干，松弛又有劲", traits: ["行动派", "心态稳", "随性"], desc: "你天生自带节奏感，把这份轻松延续成习惯就是最强竞争力。" },
  DNVP: { name: "快乐小狗体", emoji: "🐶✨", tagline: "动起来就开心，养生全靠好心情", traits: ["情绪稳定", "乐观", "易满足"], desc: "好心情是你最好的补剂，用「开心」当指标，健康自然跟着来。" },
  DNSG: { name: "野路子狠人", emoji: "🌪️🦾", tagline: "没计划但够狠，靠天赋硬扛", traits: ["天赋型", "随性", "爆发力强"], desc: "你靠本能就能扛事，但加点规律能让「狠」更持久、少受伤。" },
  DNSP: { name: "深夜战神", emoji: "🌙🍜", tagline: "作息玄学，但精力惊人", traits: ["夜猫子", "高能量", "反套路"], desc: "你的生物钟很特别，只要睡够、吃稳，战神就能一直在线。" },
  REVG: { name: "慢生活匠人", emoji: "🌿📖", tagline: "规律从容，把日子过成诗", traits: ["有条理", "讲究", "从容"], desc: "你已把健康活成生活方式，下一步是在稳中加点挑战突破平台。" },
  REVP: { name: "岁月静好体", emoji: "🕊️🌸", tagline: "松弛到极致，自带滤镜", traits: ["松弛感", "低内耗", "治愈"], desc: "你几乎不被压力绑架，维持这份静好，偶尔动一动更清透。" },
  RESG: { name: "焦虑养生家", emoji: "🧘‍♀️📿", tagline: "静养但心里操心，用计划缓解焦虑", traits: ["爱规划", "易操心", "求安心"], desc: "你用「把一切安排好」来对抗焦虑，记得留白，计划外也 OK。" },
  RESP: { name: "精致懒人", emoji: "🛋️🍵", tagline: "躺着也要躺得讲究", traits: ["舒适派", "有品位", "低能耗"], desc: "你追求「省力但高级」，把健康拆成最小可执行动作就赢了。" },
  RNVG: { name: "隐居修行体", emoji: "🏔️🍃", tagline: "不社交不卷，默默变好", traits: ["独处型", "内秀", "自律"], desc: "你不需要观众，自己在安静里迭代。加一点输出，进步会更快被看见。" },
  RNVP: { name: "无忧散仙体", emoji: "☁️🌼", tagline: "全宇宙最松弛的存在", traits: ["极致松弛", "低欲望", "佛系"], desc: "你几乎零内耗，保持就好。想再进一步，从一个小目标开始。" },
  RNSG: { name: "内耗修复体", emoji: "🔋🌧️", tagline: "想动但提不起劲，需要被唤醒", traits: ["易疲惫", "想改变", "待启动"], desc: "你不是懒，是能量被悄悄耗光。从一次 15 分钟散步重启循环。" },
  RNSP: { name: "摆烂咸鱼体", emoji: "🐟💤", tagline: "躺平有理，快乐无罪", traits: ["随心", "快乐", "零压力"], desc: "快乐是你的天赋，哪天想动一动，全世界都会为你鼓掌。" },
};

interface AxisDef {
  pos: string; // 高分极字母
  neg: string; // 低分极字母
  posLabel: string;
  negLabel: string;
  posEn: string; // 高分极英文原词（MBTI 式）
  negEn: string;
  ids: string[]; // 参与计算的题目 id
}

const AXES: AxisDef[] = [
  { pos: "D", neg: "R", posLabel: "动派", negLabel: "静派", posEn: "Dynamic", negEn: "Restful", ids: ["exercise_freq", "intensity"] },
  { pos: "E", neg: "N", posLabel: "规律党", negLabel: "随性党", posEn: "Engineered", negEn: "Natural", ids: ["sleep_hours", "sleep_quality", "diet_regular", "water"] },
  { pos: "V", neg: "S", posLabel: "松弛感", negLabel: "紧绷感", posEn: "Vacay", negEn: "Stressed", ids: ["stress", "mood"] },
  { pos: "G", neg: "P", posLabel: "目标感", negLabel: "随性派", posEn: "Goal", negEn: "Playful", ids: ["motivation"] },
];

function avgOf(answers: Record<string, number>, ids: string[]): number {
  let s = 0;
  let n = 0;
  for (const id of ids) {
    const v = answers[id];
    if (v !== undefined) {
      s += v;
      n += 1;
    }
  }
  return n > 0 ? s / n : 1.5;
}

function computePersona(answers: Record<string, number>, goalLabel?: string): Persona {
  const letters = AXES.map((a) => (avgOf(answers, a.ids) >= 1.5 ? a.pos : a.neg));
  const code = letters.join("");
  const axisLabels = AXES.map((a, i) => (letters[i] === a.pos ? a.posLabel : a.negLabel));
  const axisEnLabels = AXES.map((a, i) => (letters[i] === a.pos ? a.posEn : a.negEn));
  const base = PERSONAS[code] || PERSONAS.RNSP;
  const flavor = goalLabel ? `健康主线 · ${goalLabel}` : "";
  return { code, letters, axisLabels, axisEnLabels, flavor, ...base };
}

const SHARE_URL = "https://wonderfulclaire.github.io/AIxcellentHealth-site/";

/* ── 分享卡片（SVG → PNG）辅助函数 ── */
const CARD_FONT = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function wrapCJK(s: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of s) {
    cur += ch;
    if ([...cur].length >= max) {
      lines.push(cur);
      cur = "";
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function buildCardSVG(p: Persona, index: number): string {
  const lines = wrapCJK(p.tagline, 13);
  const tagY = 470;
  const tagSpans = lines
    .map(
      (l, i) =>
        `<text x="60" y="${tagY + i * 38}" font-size="26" fill="#ECE7D8" font-family="${CARD_FONT}">${escapeXml(l)}</text>`
    )
    .join("");
  const bottomY = tagY + lines.length * 38;
  const flavorY = p.flavor ? bottomY + 36 : bottomY;
  const axText = p.axisLabels.join(" · ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8860B"/><stop offset="0.5" stop-color="#F4D27A"/><stop offset="1" stop-color="#D4AF37"/></linearGradient></defs>
  <rect width="600" height="820" fill="#0A0A0B"/>
  <rect x="20" y="20" width="560" height="780" rx="28" fill="none" stroke="url(#g)" stroke-width="2"/>
  <text x="60" y="78" font-size="17" fill="#D4AF37" letter-spacing="3" font-family="${CARD_FONT}">你的健康人格 · HTI</text>
  <text x="60" y="210" font-size="120" font-family="${CARD_FONT}">${p.emoji}</text>
  <text x="60" y="300" font-size="44" font-weight="900" fill="#F4D27A" font-family="${CARD_FONT}">${escapeXml(p.name)}</text>
  <text x="60" y="340" font-size="26" font-weight="900" fill="#D4AF37" letter-spacing="4" font-family="'Courier New',monospace">${p.code}</text>
  <text x="60" y="372" font-size="16" fill="#D4AF37" font-family="${CARD_FONT}">${escapeXml(p.axisEnLabels.join(" · "))}</text>
  <text x="60" y="396" font-size="14" fill="#9a958a" font-family="${CARD_FONT}">${escapeXml(axText)}</text>
  ${tagSpans}
  <text x="60" y="${bottomY + 64}" font-size="20" fill="#ECE7D8" font-family="${CARD_FONT}">健康指数 <tspan fill="#F4D27A" font-weight="900" font-size="26">${index}</tspan></text>
  ${p.flavor ? `<text x="60" y="${flavorY + 30}" font-size="16" fill="#D4AF37" font-family="${CARD_FONT}">${escapeXml(p.flavor)}</text>` : ""}
  <text x="60" y="788" font-size="15" fill="#6f6a60" font-family="${CARD_FONT}">AIxcellent Health · 扫码测你的健康人格</text>
</svg>`;
}

interface Result {
  index: number;
  label: string;
  desc: string;
  risks: string[];
  advices: { title: string; text: string }[];
  goals: string[];
  persona: Persona;
}

function buildResult(answers: Record<string, number>): Result {
  let raw = 0;
  let answered = 0;
  const groupSum: Record<string, number> = {};
  const groupCnt: Record<string, number> = {};
  const advices: { title: string; text: string }[] = [];
  let goals: string[] = [];
  let goalLabel: string | undefined;

  for (const q of QUESTIONS) {
    const pick = answers[q.id];
    if (pick === undefined) continue;
    answered += 1;
    raw += pick;
    groupSum[q.group] = (groupSum[q.group] || 0) + pick;
    groupCnt[q.group] = (groupCnt[q.group] || 0) + 1;
    const opt = q.options.find((o) => o.score === pick);
    if (opt && opt.advice && pick <= 1) {
      advices.push({ title: q.group, text: opt.advice });
    }
    if (q.id === "goal" && opt) {
      goals = GOAL_MAP[opt.label] || [];
      goalLabel = opt.label;
    }
  }

  const index = answered > 0 ? Math.round((raw / (answered * MAX_PER)) * 100) : 0;

  // 风险维度：该维度平均分 < 1.5（即 < 50%）视为待关注
  const risks: string[] = [];
  const RISK_LABEL: Record<string, string> = {
    运动活力: "运动不足",
    睡眠恢复: "睡眠欠债",
    压力情绪: "压力偏高",
    饮食营养: "饮食失衡",
    体态酸痛: "酸痛预警",
    目标动力: "动力待燃",
  };
  for (const g of Object.keys(groupSum)) {
    const avg = groupSum[g] / groupCnt[g];
    if (avg < 1.5) risks.push(RISK_LABEL[g] || g);
  }

  // 去重建议，最多 4 条；若不足则用最弱维度兜底
  const seen = new Set<string>();
  const uniq = advices.filter((a) => {
    if (seen.has(a.text)) return false;
    seen.add(a.text);
    return true;
  });
  if (uniq.length === 0 && risks.length > 0) {
    uniq.push({ title: risks[0], text: "这是你当前最值得优先改善的维度，管家会为你定制起步计划。" });
  }

  const por = portrait(index);
  const persona = computePersona(answers, goalLabel);
  return {
    index,
    label: por.label,
    desc: por.desc,
    risks: risks.slice(0, 4),
    advices: uniq.slice(0, 4),
    goals,
    persona,
  };
}

/* ── 把「你的结果」翻译成 App 能为你做的事 ──
 * 每条对应一个真实功能模块（tab），点击即可直接进入该模块。 */
interface ValueItem {
  tab: string;
  name: string;
  icon: string;
  why: string;
}

function buildValueMap(result: Result, answers: Record<string, number>): ValueItem[] {
  const items: ValueItem[] = [];
  const goalQ = QUESTIONS.find((q) => q.id === "goal");
  const goalLabel = goalQ
    ? goalQ.options.find((o) => o.score === answers["goal"])?.label
    : undefined;

  // 目标导向
  if (goalLabel === "减脂塑形" || goalLabel === "增肌力量") {
    items.push({
      tab: "plan",
      name: "私人训练计划",
      icon: "🏋️",
      why: `你选了「${goalLabel}」，训练计划会按你的目标生成每周课表与动作库。`,
    });
  }
  if (goalLabel === "改善体态") {
    items.push({
      tab: "posture",
      name: "AI 姿态评估",
      icon: "🤳",
      why: "你关注体态 / 酸痛，用摄像头实时识别姿态，找出动作偏差。",
    });
    items.push({
      tab: "video",
      name: "视频动作分析",
      icon: "🎬",
      why: "上传训练视频，逐帧分析动作质量与受伤风险点。",
    });
  }
  if (goalLabel === "提升精力") {
    items.push({
      tab: "sleep",
      name: "睡眠质量监控",
      icon: "😴",
      why: "你最想提升精力 / 睡眠，睡眠模块追踪睡眠时长与质量趋势。",
    });
  }

  // 风险导向
  if (result.risks.includes("运动不足")) {
    items.push({
      tab: "plan",
      name: "私人训练计划",
      icon: "🏋️",
      why: "评估显示你运动偏少，训练计划从低门槛起步帮你养成习惯。",
    });
  }
  if (result.risks.includes("睡眠欠债")) {
    items.push({
      tab: "sleep",
      name: "睡眠质量监控",
      icon: "😴",
      why: "睡眠在拖后腿，睡眠模块帮你量化并持续改善睡眠质量。",
    });
  }
  if (result.risks.includes("压力偏高")) {
    items.push({
      tab: "doctor",
      name: "私人健康管家",
      icon: "🧘",
      why: "压力偏高时，管家能陪你做呼吸放松并给出调节建议。",
    });
    items.push({
      tab: "tcm",
      name: "中医节气养生",
      icon: "🌿",
      why: "结合节气与体质，给你饮食与作息的舒缓方案。",
    });
  }
  if (result.risks.includes("饮食失衡")) {
    items.push({
      tab: "nutrition",
      name: "私人营养订制",
      icon: "🥗",
      why: "饮食是短板，营养模块按目标定制每日食谱与补给。",
    });
    items.push({
      tab: "diet",
      name: "饮食追踪",
      icon: "📝",
      why: "随手记录三餐，管家帮你看见隐形热量与营养缺口。",
    });
  }
  if (result.risks.includes("酸痛预警")) {
    items.push({
      tab: "posture",
      name: "AI 姿态评估",
      icon: "🤳",
      why: "你常酸痛，先做姿态评估定位问题，再对症训练。",
    });
  }
  if (result.risks.includes("动力待燃")) {
    items.push({
      tab: "hub",
      name: "私人健康管家",
      icon: "💬",
      why: "需要人带着做？管家每日提醒、陪你打卡，把计划拆成小任务。",
    });
  }

  // 永远保留「管家」作为随时问答入口
  if (!items.some((i) => i.tab === "hub")) {
    items.push({
      tab: "hub",
      name: "私人健康管家",
      icon: "💬",
      why: "任何健康疑问随时问管家，它会结合你的评估结果回答。",
    });
  }

  // 同名模块只留第一条，最多 5 张
  const seen = new Set<string>();
  return items
    .filter((i) => {
      if (seen.has(i.name)) return false;
      seen.add(i.name);
      return true;
    })
    .slice(0, 5);
}

const STYLE = `
.qa-wrap{max-width:680px;margin:0 auto;padding:24px 18px 80px;color:var(--ink);}
.qa-top{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.qa-top .qa-king{font-size:12px;letter-spacing:.18em;color:var(--gold);font-weight:800;}
.qa-h1{font-size:24px;font-weight:900;margin:2px 0 4px;line-height:1.25;}
.qa-sub{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:14px;}
.qa-explain{background:linear-gradient(180deg,rgba(212,175,55,.08),rgba(212,175,55,.02));border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--muted);line-height:1.7;}
.qa-explain b{color:var(--gold-light);}
.qa-progress{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 8px;margin-bottom:8px;}
.qa-bar{height:8px;border-radius:99px;background:rgba(212,175,55,.14);overflow:hidden;}
.qa-bar>i{display:block;height:100%;background:var(--gold-grad);border-radius:99px;transition:width .35s ease;}
.qa-prog-row{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:6px;}
.qa-live{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:14px 0;}
.qa-ring{--p:0;width:54px;height:54px;border-radius:50%;flex:0 0 auto;background:conic-gradient(var(--gold) calc(var(--p)*1%),rgba(212,175,55,.14) 0);display:grid;place-items:center;}
.qa-ring>span{width:42px;height:42px;border-radius:50%;background:var(--bg);display:grid;place-items:center;font-weight:900;font-size:14px;color:var(--gold-light);}
.qa-live-t{font-size:13px;color:var(--muted);line-height:1.5;}
.qa-live-t b{color:var(--ink);}
.qa-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 18px;box-shadow:0 18px 40px rgba(0,0,0,.35);}
.qa-q{font-size:18px;font-weight:800;line-height:1.4;margin-bottom:4px;}
.qa-hint{font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.6;}
.qa-opt{display:block;width:100%;text-align:left;background:rgba(255,255,255,.02);border:1px solid var(--line);color:var(--ink);border-radius:14px;padding:14px 16px;margin-bottom:10px;font-size:15px;font-weight:600;cursor:pointer;transition:.15s ease;}
.qa-opt:hover{border-color:var(--gold);transform:translateY(-1px);}
.qa-opt.on{background:linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06));border-color:var(--gold);color:var(--gold-light);}
.qa-opt .qa-tick{float:right;color:var(--gold);}
.qa-nav{display:flex;gap:10px;margin-top:18px;}
.qa-btn{flex:1;border-radius:14px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--muted);}
.qa-btn.primary{background:var(--gold-grad);color:#0A0A0B;border:none;box-shadow:0 10px 24px rgba(212,175,55,.25);}
.qa-btn:disabled{opacity:.4;cursor:not-allowed;}
.qa-result .qa-score{display:flex;align-items:center;gap:18px;margin:6px 0 18px;}
.qa-big{--p:0;width:104px;height:104px;border-radius:50%;flex:0 0 auto;background:conic-gradient(var(--gold) calc(var(--p)*1%),rgba(212,175,55,.14) 0);display:grid;place-items:center;}
.qa-big>span{width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#1c1c20,#0c0c0e);display:grid;place-items:center;}
.qa-big b{font-size:34px;color:var(--gold-light);line-height:1;}
.qa-big small{display:block;font-size:11px;color:var(--muted);text-align:center;margin-top:2px;}
.qa-portrait .qa-pl{font-size:22px;font-weight:900;color:var(--gold-light);}
.qa-portrait .qa-pd{font-size:13.5px;color:var(--muted);line-height:1.6;margin-top:4px;}
.qa-chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0;}
.qa-chip{font-size:12.5px;font-weight:700;padding:6px 12px;border-radius:99px;background:rgba(212,175,55,.12);border:1px solid var(--line);color:var(--gold-light);}
.qa-chip.risk{background:rgba(255,120,90,.12);border-color:rgba(255,120,90,.3);color:#ff9b7a;}
.qa-sec{font-size:13px;letter-spacing:.14em;color:var(--gold);font-weight:800;margin:18px 0 10px;}
.qa-advice{background:rgba(255,255,255,.02);border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:12px;padding:12px 14px;margin-bottom:10px;}
.qa-advice b{display:block;color:var(--gold-light);font-size:14px;margin-bottom:4px;}
.qa-advice span{font-size:13.5px;color:var(--muted);line-height:1.65;}
.qa-value{display:grid;grid-template-columns:1fr;gap:10px;margin:4px 0 4px;}
.qa-vcard{background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:14px;padding:14px 15px;}
.qa-vhead{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.qa-vicon{font-size:18px;}
.qa-vhead b{font-size:15px;color:var(--ink);}
.qa-vwhy{font-size:13px;color:var(--muted);line-height:1.6;margin:0 0 10px;}
.qa-vgo{display:inline-block;background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.04));border:1px solid var(--gold);color:var(--gold-light);border-radius:10px;padding:8px 14px;font-size:13.5px;font-weight:800;cursor:pointer;transition:.15s ease;}
.qa-vgo:hover{background:var(--gold-grad);color:#0A0A0B;}
.qa-cta{display:flex;flex-direction:column;gap:10px;margin-top:22px;}
.qa-cta .qa-btn.primary{font-size:16px;padding:16px;}
.qa-quiet-login{margin-top:12px;background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;text-decoration:underline;}
.qa-replay{text-align:center;margin-top:14px;}
.qa-replay button{background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;text-decoration:underline;}

/* ── 健康人格卡 ── */
.qa-persona{border:1px solid var(--line);border-radius:20px;padding:22px 20px;margin-bottom:18px;background:linear-gradient(160deg,rgba(212,175,55,.10),rgba(212,175,55,.02));position:relative;overflow:hidden;}
.qa-persona:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 82% -10%,rgba(212,175,55,.20),transparent 60%);pointer-events:none;}
.qa-pbadge{font-size:11px;letter-spacing:.22em;color:var(--gold);font-weight:800;position:relative;}
.qa-prow{display:flex;gap:16px;align-items:center;margin-top:8px;position:relative;}
.qa-pemoji{font-size:62px;line-height:1;flex:0 0 auto;filter:drop-shadow(0 6px 14px rgba(212,175,55,.35));}
.qa-pmain{min-width:0;}
.qa-pname{font-size:28px;font-weight:900;color:var(--gold-light);line-height:1.15;}
.qa-pcode{font-size:30px;font-weight:900;color:var(--gold);letter-spacing:.18em;margin-top:4px;font-family:'Courier New',monospace;}
.qa-pen{font-size:13px;font-weight:700;color:var(--gold-light);letter-spacing:.03em;margin-top:3px;}
.qa-pcode-sub{font-size:12px;color:var(--muted);font-weight:600;letter-spacing:0;margin-top:3px;}
.qa-ptag{font-size:15px;color:var(--ink);margin-top:8px;line-height:1.5;font-style:italic;position:relative;}
.qa-pindex{margin-top:14px;font-size:14px;color:var(--muted);position:relative;}
.qa-pindex b{font-size:22px;color:var(--gold-light);margin-left:6px;}
.qa-pflavor{margin-top:6px;font-size:13px;color:var(--gold);font-weight:700;position:relative;}
.qa-ptraits{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;position:relative;}
.qa-pshare{display:flex;gap:10px;margin-top:18px;position:relative;}
.qa-pshare .qa-btn{flex:1;font-size:14px;padding:13px;}
.qa-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--gold-grad);color:#0A0A0B;font-weight:800;font-size:14px;padding:12px 20px;border-radius:99px;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:50;}
`;

export default function QuickAssessment({
  onComplete,
  onToModule,
  onLogin,
}: {
  onComplete?: () => void;
  onToModule?: (t: string) => void;
  onLogin?: () => void;
}) {
  const [step, setStep] = useState(0); // 0..N-1 题目；N = 结果
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");

  const total = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const isResult = step >= total;

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  // 实时（部分）指数预览
  const liveIndex = useMemo(() => {
    let raw = 0;
    let n = 0;
    for (const q of QUESTIONS) {
      const p = answers[q.id];
      if (p !== undefined) {
        raw += p;
        n += 1;
      }
    }
    return n > 0 ? Math.round((raw / (n * MAX_PER)) * 100) : 0;
  }, [answers]);

  const result: Result | null = useMemo(
    () => (isResult ? buildResult(answers) : null),
    [isResult, answers]
  );

  // 依据结果推荐的 App 功能（接回真实模块）
  const valueMap = useMemo(
    () => (result ? buildValueMap(result, answers) : []),
    [result, answers]
  );

  const handleShare = () => {
    if (!result) return;
    const p = result.persona;
    const text = `我的健康人格是【${p.name} ${p.code}】${p.emoji}\n"${p.tagline}"\n${
      p.flavor ? p.flavor + "\n" : ""
    }测测你的 → AIxcellent Health\n${SHARE_URL}`;
    const nav = navigator as any;
    if (nav.share) {
      nav.share({ title: "我的健康人格", text }).catch(() => {});
    } else if (nav.clipboard?.writeText) {
      nav.clipboard
        .writeText(text)
        .then(() => showToast("已复制，去粘贴分享吧～"))
        .catch(() => showToast("复制失败，请手动分享"));
    } else {
      showToast("当前环境不支持分享，请截图保存");
    }
  };

  const handleSaveImg = () => {
    if (!result) return;
    const p = result.persona;
    const svg = buildCardSVG(p, result.index);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 600 * scale;
      canvas.height = 820 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        showToast("生成图片失败");
        URL.revokeObjectURL(url);
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, 600, 820);
      canvas.toBlob((b) => {
        if (!b) {
          showToast("生成图片失败");
          URL.revokeObjectURL(url);
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `健康人格-${p.name}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("图片已保存到下载 ✓");
      }, "image/png");
    };
    img.onerror = () => {
      showToast("生成图片失败");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const choose = (score: number) => {
    const q = QUESTIONS[step];
    setAnswers((a) => ({ ...a, [q.id]: score }));
    // 自动前进，营造顺畅的测评节奏
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, total));
    }, 180);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const prev = (await getProfile()) || {};
      const merged = {
        ...prev,
        goals: result.goals.length ? result.goals : prev.goals || [],
        assess_index: result.index,
        assess_label: result.label,
        assess_risks: result.risks,
        assess_persona: result.persona.code,
        assess_persona_name: result.persona.name,
        assess_at: new Date().toISOString(),
      };
      await saveProfile(merged);
      setSaved(true);
    } catch {
      /* 本地演示模式即使失败也不阻塞体验 */
    } finally {
      setSaving(false);
    }
  };

  // 进入结果页即自动把结果存到本地档案（演示模式无需登录），保证后续模块能读到
  useEffect(() => {
    if (isResult && !saved) void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResult]);

  return (
    <div className="qa-wrap">
      <style>{STYLE}</style>

      <div className="qa-top">
        <span className="qa-king">PRIVATE HEALTH ASSESSMENT</span>
      </div>
      <h1 className="qa-h1">3 分钟私人健康评估</h1>
      <p className="qa-sub">
        12 个轻松小问题，立刻生成你的<b style={{ color: "var(--gold-light)" }}>健康指数</b>、专属<b style={{ color: "var(--gold-light)" }}>健康人格</b>与个性化建议。
        全程本地完成，数据不离开你的设备。
      </p>

      <div className="qa-explain">
        <b>这份评估能给你什么？</b>
        <br />① <b>健康指数</b>：用 0–100 分直观衡量你的整体状态；
        ② <b>健康人格卡（HTI）</b>：像 MBTI 一样测出你的 4 字母人格代号（如 DEVG），可一键分享；
        ③ <b>风险预警</b>：指出最该优先改善的维度；
        ④ <b>个性化建议 + 为你推荐的功能</b>：不只告诉你问题，还直接带你用起来。
      </div>

      {!isResult && (
        <div className="qa-progress">
          <div className="qa-bar">
            <i style={{ width: `${(answeredCount / total) * 100}%` }} />
          </div>
          <div className="qa-prog-row">
            <span>第 {Math.min(step + 1, total)} / {total} 题</span>
            <span>{answeredCount} 已答</span>
          </div>
        </div>
      )}

      {!isResult && (
        <div className="qa-live">
          <div className="qa-ring" style={{ ["--p" as any]: liveIndex }}>
            <span>{liveIndex}</span>
          </div>
          <div className="qa-live-t">
            实时健康指数预览 · <b>边答边算</b>
            <br />
            每答一题，指数会即时更新，结束即出完整报告。
          </div>
        </div>
      )}

      {!isResult && (
        <div className="qa-card">
          <div className="qa-q">{QUESTIONS[step].q}</div>
          {QUESTIONS[step].hint && <div className="qa-hint">{QUESTIONS[step].hint}</div>}
          {QUESTIONS[step].options.map((o) => {
            const on = answers[QUESTIONS[step].id] === o.score;
            return (
              <button
                key={o.label}
                className={`qa-opt ${on ? "on" : ""}`}
                onClick={() => choose(o.score)}
              >
                {o.label}
                {on && <span className="qa-tick">✓</span>}
              </button>
            );
          })}
          <div className="qa-nav">
            <button className="qa-btn" onClick={back} disabled={step === 0}>
              上一步
            </button>
            <button
              className="qa-btn primary"
              onClick={() => setStep((s) => Math.min(s + 1, total))}
              disabled={answers[QUESTIONS[step].id] === undefined}
            >
              {step === total - 1 ? "查看我的报告" : "下一步"}
            </button>
          </div>
        </div>
      )}

      {isResult && result && (() => {
        const p = result.persona;
        return (
          <div className="qa-result">
            {/* ── 健康人格卡（分享主角） ── */}
            <div className="qa-persona">
              <div className="qa-pbadge">你的健康人格 · HTI</div>
              <div className="qa-prow">
                <div className="qa-pemoji">{p.emoji}</div>
                <div className="qa-pmain">
                  <div className="qa-pname">{p.name}</div>
                  <div className="qa-pcode">{p.code}</div>
                  <div className="qa-pen">{p.axisEnLabels.join(" · ")}</div>
                  <div className="qa-pcode-sub">{p.axisLabels.join(" · ")}</div>
                  <div className="qa-ptag">“{p.tagline}”</div>
                </div>
              </div>
              <div className="qa-pindex">
                健康指数<b>{result.index}</b>
              </div>
              {p.flavor && <div className="qa-pflavor">{p.flavor}</div>}
              <div className="qa-ptraits">
                {p.traits.map((t) => (
                  <span key={t} className="qa-chip">
                    {t}
                  </span>
                ))}
              </div>
              <div className="qa-pshare">
                <button className="qa-btn primary" onClick={handleShare}>
                  分享我的健康人格
                </button>
                <button className="qa-btn" onClick={handleSaveImg}>
                  保存为图片
                </button>
              </div>
            </div>

            {result.risks.length > 0 && (
              <>
                <div className="qa-sec">需优先关注的维度</div>
                <div className="qa-chips">
                  {result.risks.map((r) => (
                    <span key={r} className="qa-chip risk">
                      {r}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="qa-sec">为你定制的建议</div>
            {result.advices.length === 0 && (
              <div className="qa-advice">
                <span>你的整体状态已经很均衡，保持节奏、定期微调就是最好的策略。</span>
              </div>
            )}
            {result.advices.map((a, i) => (
              <div key={i} className="qa-advice">
                <b>{a.title}</b>
                <span>{a.text}</span>
              </div>
            ))}

            {/* ── 把评估结果接回真实功能：让用户立刻知道 App 能为自己做什么 ── */}
            <div className="qa-sec">🎯 这个 App 能为你做什么</div>
            <div className="qa-value">
              {valueMap.map((v) => (
                <div key={v.tab + v.name} className="qa-vcard">
                  <div className="qa-vhead">
                    <span className="qa-vicon">{v.icon}</span>
                    <b>{v.name}</b>
                  </div>
                  <p className="qa-vwhy">{v.why}</p>
                  <button
                    className="qa-vgo"
                    onClick={() => {
                      void save();
                      onToModule?.(v.tab);
                    }}
                  >
                    去体验 →
                  </button>
                </div>
              ))}
            </div>

            <div className="qa-cta">
              <button className="qa-btn primary" onClick={() => void save()} disabled={saving}>
                {saved ? "✓ 结果已保存（本地）" : saving ? "保存中…" : "保存我的评估结果"}
              </button>
              {onLogin && (
                <button className="qa-quiet-login" onClick={onLogin}>
                  想跨设备同步？登录 / 注册
                </button>
              )}
            </div>
            <div className="qa-replay">
              <button
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setSaved(false);
                }}
              >
                重新评估一次
              </button>
            </div>
          </div>
        );
      })()}

      {toast && <div className="qa-toast">{toast}</div>}
    </div>
  );
}
