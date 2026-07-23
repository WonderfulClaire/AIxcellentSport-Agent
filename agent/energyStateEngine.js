// app/agent/energyStateEngine.js
// 能量状态自适应健康方案引擎
// 核心思想：人不是一直忙也不是一直闲，而是处在不同的「能量态」里。
// 每种态身体处于不同的中医证型，需要不同的「调出高能量 / 滋补修复」策略。
// 建议来源双引擎：🌿 中医（节气+天气+体质） + 🌟 明星规划师（能量管理+补给）

import { getCurrentSolarTerm, getWeatherTCMAdvice, BODY_TYPES } from "./tcmEngine.js";
import { callLLM } from "./coachAgent.js";

/**
 * 五种能量态定义
 * 每个态包含：中医调理方向 + 明星规划师策略 + 调出高能量 + 休息滋补
 */
export const ENERGY_STATES = {
  // 🔥 高压冲刺态：连续高压、赶 deadline，身体进入"耗散"模式
  sprint: {
    id: "sprint",
    label: "高压冲刺态",
    icon: "🔥",
    tcmPattern: "肝郁化火 · 心脾两虚 · 耗气伤阴",
    desc: "连续高压、赶 deadline，身体进入「耗散」模式：易肝火上炎、脾气急躁、失眠、肩颈僵硬。",
    color: "#ef4444",
    tcm: {
      principle: "疏肝解郁、清心安神、益气养阴",
      diet: [
        "🌹 玫瑰花茶（疏肝理气，情绪烦躁时喝）",
        "🍵 菊花枸杞茶（清肝明目，久盯屏幕护眼）",
        "🥣 莲子百合羹（清心安神，晚间助眠）",
        "🌰 酸枣仁（养心血、安神，睡前泡水或煮粥）",
        "🍠 山药薏米（健脾益气，保护被消耗的中气）",
        "清淡少油，减轻脾胃负担",
      ],
      acupoints: [
        "太冲穴（足背，疏肝理气第一要穴，生气时按）",
        "内关穴（腕上，宁心安神、缓解心悸）",
        "百会穴（头顶，提神醒脑）",
        "太阳穴（缓解紧张性头痛）",
      ],
      avoid: [
        "咖啡超过 3 杯 / 靠咖啡续命",
        "辛辣烧烤、油腻厚重（加重内热）",
        "熬夜硬扛（最伤阴血）",
        "酒精：借酒消愁反而伤肝耗阴",
      ],
    },
    planner: {
      strategy: [
        "⏱️ 90 分钟「超日节律」工作块 + 10 分钟强制微休息（脑力每 90 分钟一个波谷）",
        "🧠 最重要、最难的认知任务放能量峰值（通常上午 9–11 点）",
        "📦 任务批处理：同类事集中做，减少上下文切换的隐性损耗",
        "🔕 单任务聚焦：工作时关通知、开勿扰",
        "🌙 数字日落（Digital Sunset）：睡前 1 小时禁屏，护住褪黑素",
      ],
      supplements: [
        "红景天（适应原 adaptogen，抗疲劳）",
        "西洋参 / 人参（补气提神，上午用）",
        "B 族维生素（能量代谢辅酶）",
        "镁（晚间服，缓解神经紧张、助眠）",
        "⚠️ 咖啡因截止 14:00，否则影响当晚睡眠",
      ],
    },
    highEnergy: [
      "🌅 晨间户外光照 10 分钟（调节皮质醇节律，天然提神）",
      "🚶 每 90 分钟起身快走 / 拉伸 5 分钟（打断久坐耗气血）",
      "💧 充足饮水（脱水 2% 就明显疲劳）",
      "😮‍💨 冷水洗脸 / 4-7-8 呼吸法（激活副交感，瞬间清醒）",
      "😴 午间 20 分钟 power nap（不超过 30 分钟，避免昏沉）",
    ],
    nourish: [
      "🌿 晚间酸枣仁 / 桂圆莲子茶安神",
      "🦶 足浴（艾草 / 生姜）引火下行、助眠",
      "💆 肩颈自我按摩 / 筋膜枪放松",
      "🛏️ 哪怕只比平时早睡 30 分钟，也是在「存钱」",
    ],
    actions: [
      { slot: "morning", cat: "energy", text: "晨间户外光照 10 分钟，调节皮质醇节律" },
      { slot: "forenoon", cat: "planner", text: "把最难的任务放在上午能量峰值，关通知单线程推进" },
      { slot: "forenoon", cat: "tcm", text: "泡一杯玫瑰花茶 / 菊花枸杞茶疏肝清肝" },
      { slot: "afternoon", cat: "energy", text: "每 90 分钟起身快走拉伸 5 分钟，补水" },
      { slot: "afternoon", cat: "planner", text: "咖啡因截止 14:00，之后只喝温水或无咖啡因" },
      { slot: "evening", cat: "tcm", text: "酸枣仁 / 桂圆莲子茶 + 艾草足浴，引火下行助眠" },
      { slot: "night", cat: "planner", text: "数字日落：睡前 1 小时放下手机" },
    ],
  },

  // 🌿 周末修复态：休息 / 低压力，身体进入"收纳"模式，适合补益
  rest: {
    id: "rest",
    label: "周末修复态",
    icon: "🌿",
    tcmPattern: "脾肾当补 · 气血收纳",
    desc: "休息 / 低压力时段，身体进入「收纳」模式：适合补益、排毒、调理，把一周亏空补回来。",
    color: "#16a34a",
    tcm: {
      principle: "健脾祛湿、补肾养血、温补收纳",
      diet: [
        "🍯 红枣桂圆茶（补气血）",
        "⚫ 黑芝麻糊（补肾养血、润发）",
        "🍲 山药排骨汤 / 当归生姜羊肉汤（温补）",
        "🍐 银耳莲子羹（滋阴润燥）",
        "慢炖药膳汤（黄芪 / 枸杞 / 当归）最养人",
      ],
      acupoints: [
        "足三里（健脾第一穴，常按健脾胃）",
        "关元穴（补元气，脐下三寸）",
        "三阴交（养血调经血）",
        "涌泉穴（补肾，可搓脚心）",
      ],
      avoid: [
        "报复性熬夜（补觉≠乱睡）",
        "暴饮暴食、生冷冰饮（伤脾阳）",
        "一躺一整天不动（气血反而凝滞）",
      ],
    },
    planner: {
      strategy: [
        "🚶 主动恢复（Active Recovery）：轻散步 / 瑜伽 / 骑行，而非躺平刷手机",
        "😴 睡眠补偿适度（补 1–2 小时即可，别昼夜颠倒）",
        "🧹 断舍离整理（环境秩序 → 心理秩序）",
        "🌳 自然接触（森林浴 / 公园，显著降低皮质醇）",
        "🤝 社交充电（见喜欢的人，情绪滋养）",
      ],
      supplements: [
        "胶原蛋白 + 维 C（修复、抗氧化）",
        "鱼油（抗炎、护脑）",
        "益生菌（肠道微生态）",
        "维 D（若日照不足）",
      ],
    },
    highEnergy: [
      "🌞 晨练唤醒：阳光 + 轻度有氧，把生物钟调回正轨",
      "📅 提前规划好「充电活动」，别把休息变成无意识刷手机",
      "🏞️ 去公园 / 郊外走一走，自然光是最强的节律调节器",
    ],
    nourish: [
      "🍲 慢炖一锅药膳汤（当归 / 黄芪 / 枸杞），温补一整周亏空",
      "🛏️ 早睡 + 自然醒，给肝肾真正的修复窗口",
      "🦶 艾草足浴 / 泡澡，引血下行、安神",
      "💆 全身按摩 / 推拿，疏通一周的筋结",
    ],
    actions: [
      { slot: "morning", cat: "energy", text: "晨练唤醒：户外快走 / 瑜伽 20 分钟 + 晒太阳" },
      { slot: "morning", cat: "tcm", text: "煮一锅药膳汤（当归 / 黄芪 / 枸杞），温补一周亏空" },
      { slot: "forenoon", cat: "planner", text: "主动恢复：散步 / 骑行，而不是躺平刷手机" },
      { slot: "afternoon", cat: "planner", text: "断舍离整理 + 去公园自然接触，降低皮质醇" },
      { slot: "evening", cat: "tcm", text: "艾草足浴 + 早睡，给肝肾真正修复窗口" },
      { slot: "night", cat: "planner", text: "自然醒优先，别报复性熬夜补觉" },
    ],
  },

  // ⚖️ 日常平衡态：维持节律、轻滋养
  balance: {
    id: "balance",
    label: "日常平衡态",
    icon: "⚖️",
    tcmPattern: "阴阳调和 · 维持节律",
    desc: "不忙不闲的日常，身体追求「稳态」：维持规律、轻滋养，为下一波冲刺蓄力。",
    color: "#0891b2",
    tcm: {
      principle: "平补平泻、规律作息、轻滋养",
      diet: [
        "五谷杂粮 + 当季蔬果 + 适量肉蛋奶",
        "少量坚果（核桃 / 黑芝麻）补肾健脑",
        "顺应节气的时令食材（见下方养生建议）",
      ],
      acupoints: [
        "合谷穴（日常保健、提气）",
        "足三里（健脾）",
        "三阴交（养血）",
      ],
      avoid: ["熬夜", "饮食不节", "久坐不动"],
    },
    planner: {
      strategy: [
        "🕐 固定作息：每天同一时间睡 / 起，生物钟最稳",
        "🏃 固定运动时间：把运动排进日历，像会议一样不可删",
        "📆 周计划：周日晚花 10 分钟规划下周，减少决策消耗",
        "🔄 微习惯：每天 1 件滋养自己的小事",
      ],
      supplements: ["综合维生素", "维 D（若少晒太阳）", "鱼油（可选）"],
    },
    highEnergy: [
      "🌅 固定晨间仪式（一杯温水 + 拉伸），唤醒身体",
      "🚶 每小时起身 2 分钟，打断久坐",
      "💧 规律补水，别等渴了才喝",
    ],
    nourish: [
      "🧘 八段锦 / 太极（柔和中正，养气）",
      "🦶 睡前泡脚，引火归元",
      "😴 保证 7–8 小时睡眠",
    ],
    actions: [
      { slot: "morning", cat: "energy", text: "晨间仪式：温水 + 拉伸，唤醒身体" },
      { slot: "forenoon", cat: "planner", text: "把运动排进日历，像会议一样不可删" },
      { slot: "afternoon", cat: "energy", text: "每小时起身 2 分钟，打断久坐" },
      { slot: "evening", cat: "tcm", text: "八段锦 / 太极 15 分钟，柔和中正养气" },
      { slot: "night", cat: "planner", text: "固定时间入睡，保证 7–8 小时" },
    ],
  },

  // 😴 疲劳透支态：已亮红灯，需紧急修复
  depleted: {
    id: "depleted",
    label: "疲劳透支态",
    icon: "😴",
    tcmPattern: "气血两虚 · 正气不足 · 已亮红灯",
    desc: "持续疲惫、提不起劲、睡了也累——身体在报警。此时别硬扛，先修复再谈能量。",
    color: "#7c3aed",
    tcm: {
      principle: "急则治标、减载休息、益气固本",
      diet: [
        "易消化的温补：小米粥、鲫鱼汤、黄芪鸡汤",
        "红枣、桂圆（补气血）",
        "避免生冷、难消化食物",
      ],
      acupoints: [
        "足三里（健脾胃、化生气血）",
        "关元、气海（补元气，艾灸更佳）",
        "百会（升提阳气，按揉缓解头沉）",
      ],
      avoid: [
        "继续硬扛、带病熬夜",
        "剧烈运动（雪上加霜）",
        "靠咖啡续命（透支最后一口气）",
      ],
    },
    planner: {
      strategy: [
        "🛑 减载：能请假就请假，能委托就委托，能延后就延后",
        "😴 强制休息：睡眠优先于一切待办",
        "🏥 就医排查：持续疲劳要查甲功、血常规、维生素 D、铁蛋白",
        "📵 信息断食：少看消息，减少心理消耗",
      ],
      supplements: ["铁（若贫血）", "维 B12", "维 D", "（先就医，遵医嘱）"],
    },
    highEnergy: [
      "先恢复再谈能量，此刻「少做 = 多做」",
      "🚶 短程散步 10 分钟，微微活动即可，别累",
      "🌞 晒 15 分钟太阳，调节情绪与昼夜节律",
    ],
    nourish: [
      "😴 充足睡眠是第一位「补药」",
      "🍲 温补易吸收：黄芪鸡汤、小米粥",
      "🤒 若持续 2 周以上疲劳，务必就医",
    ],
    actions: [
      { slot: "morning", cat: "planner", text: "减载：把非紧急任务推迟 / 委托，今天只做最必要的事" },
      { slot: "forenoon", cat: "tcm", text: "喝一碗小米粥 / 黄芪鸡汤，温补易吸收" },
      { slot: "afternoon", cat: "planner", text: "信息断食：少看消息，减少心理消耗" },
      { slot: "evening", cat: "planner", text: "强制早睡，睡眠优先于一切待办" },
      { slot: "night", cat: "planner", text: "若持续 2 周以上疲劳，预约就医查甲功 / 血常规" },
    ],
  },

  // 💪 运动增能态：训练日，营养 + 恢复配合
  training: {
    id: "training",
    label: "运动增能态",
    icon: "💪",
    tcmPattern: "气血流通 · 筋骨舒展",
    desc: "训练日，身体进入「建设」模式：运动后及时补养，恢复做足，才能越练越强。",
    color: "#f59e0b",
    tcm: {
      principle: "运动配合营养与恢复、疏筋活络",
      diet: [
        "运动前：适量碳水（香蕉 / 燕麦）供能",
        "运动后 30–60 分钟：蛋白 + 碳水（鸡蛋 / 牛奶 / 红薯）",
        "充足饮水，少量多次",
      ],
      acupoints: [
        "运动后拉伸放松筋结",
        "足三里（健脾胃、助吸收）",
        "阳陵泉（筋会，舒筋活络）",
      ],
      avoid: ["空腹剧烈运动", "运动后立刻灌冰饮", "练完不拉伸"],
    },
    planner: {
      strategy: [
        "⏱️ 训练日营养 timing：练前碳水、练后蛋白窗口",
        "🛌 恢复三件套：睡眠 + 拉伸 + 泡沫轴",
        "📈 渐进超负荷：每周增量别超 10%",
        "📅 训练 / 休息日交替，给身体修复窗口",
      ],
      supplements: ["蛋白粉", "肌酸（增力）", "BCAA（缓冲酸痛）", "镁（恢复）"],
    },
    highEnergy: [
      "☕ 训练前咖啡因（若习惯）可提升表现",
      "🔥 充分热身 10 分钟，激活神经肌肉",
      "💧 训练中规律补水",
    ],
    nourish: [
      "🥛 抓住运动后营养窗口（蛋白 + 碳水）",
      "🧘 练后拉伸 + 泡沫轴，加速恢复",
      "😴 训练日更要睡足，肌肉在睡中生长",
    ],
    actions: [
      { slot: "morning", cat: "planner", text: "训练前热身 10 分钟 + 适量碳水供能" },
      { slot: "forenoon", cat: "tcm", text: "运动中规律补水，少量多次" },
      { slot: "afternoon", cat: "tcm", text: "运动后 30–60 分钟补充蛋白 + 碳水（营养窗口）" },
      { slot: "evening", cat: "planner", text: "练后拉伸 + 泡沫轴，加速恢复" },
      { slot: "night", cat: "planner", text: "训练日睡足，肌肉在睡眠中修复生长" },
    ],
  },
};

/**
 * 时段划分（用于「今日行动清单」的时间感知排序）
 */
export const TIME_SLOTS = {
  morning: { label: "清晨", rank: 0, range: [5, 9] },
  forenoon: { label: "上午", rank: 1, range: [9, 12] },
  noon: { label: "午间", rank: 2, range: [12, 14] },
  afternoon: { label: "下午", rank: 3, range: [14, 18] },
  evening: { label: "傍晚", rank: 4, range: [18, 21] },
  night: { label: "夜间", rank: 5, range: [21, 29] }, // 21-24 及 0-5
};

export function getTimeSlot(hour) {
  for (const [key, v] of Object.entries(TIME_SLOTS)) {
    const [a, b] = v.range;
    if (key === "night") {
      if (hour >= a || hour < 5) return key;
    } else if (hour >= a && hour < b) {
      return key;
    }
  }
  return "forenoon";
}

/**
 * 构建能量方案（规则版，纯前端可用）
 * @param {string} stateId
 * @param {{hour?:number, isWeekend?:boolean, weather?:object, constitution?:string}} ctx
 */
export function buildEnergyPlan(stateId, ctx = {}) {
  const state = ENERGY_STATES[stateId] || ENERGY_STATES.balance;
  const hour = ctx.hour ?? new Date().getHours();
  const isWeekend = ctx.isWeekend ?? [0, 6].includes(new Date().getDay());
  const constitution = ctx.constitution || "balanced";
  const solarTerm = getCurrentSolarTerm();
  const weather = ctx.weather || null;

  // 节气 / 天气 / 体质 的三方联动建议
  const tcmExtras = [];
  tcmExtras.push(`🌿 当前节气「${solarTerm.current.name}」：${solarTerm.current.tcm}`);
  tcmExtras.push(`🍲 节气推荐食材：${solarTerm.current.diet}`);
  if (solarTerm.daysToNext <= 3) {
    tcmExtras.push(`📅 再过 ${solarTerm.daysToNext} 天进入「${solarTerm.next.name}」，注意调整起居`);
  }
  if (weather) {
    const wAdvice = getWeatherTCMAdvice(weather);
    wAdvice.slice(0, 2).forEach((a) => tcmExtras.push(`🌤️ ${a.text}`));
  }
  const bt = BODY_TYPES.find((b) => b.id === constitution) || BODY_TYPES[4];
  if (bt.id !== "balanced") {
    tcmExtras.push(`🧬 你的${bt.name}：${bt.advice.diet}`);
  }

  // 今日行动清单：时间感知排序
  const nowSlot = getTimeSlot(hour);
  const actions = (state.actions || []).map((a) => ({
    ...a,
    slotLabel: TIME_SLOTS[a.slot]?.label || "",
    isNow: a.slot === nowSlot,
  }));
  actions.sort((x, y) => {
    if (x.isNow !== y.isNow) return x.isNow ? -1 : 1;
    return (TIME_SLOTS[x.slot]?.rank ?? 9) - (TIME_SLOTS[y.slot]?.rank ?? 9);
  });

  return {
    state: {
      id: state.id,
      label: state.label,
      icon: state.icon,
      color: state.color,
      tcmPattern: state.tcmPattern,
      desc: state.desc,
    },
    context: {
      solarTerm: solarTerm.current.name,
      daysToNext: solarTerm.daysToNext,
      nextTerm: solarTerm.next.name,
      weather: weather ? `${weather.temp ?? "?"}°C ${weather.condition ?? ""}` : "未获取",
      constitution: bt.name,
      timeSlot: TIME_SLOTS[nowSlot].label,
      isWeekend,
    },
    tcm: {
      principle: state.tcm.principle,
      diet: state.tcm.diet,
      acupoints: state.tcm.acupoints,
      avoid: state.tcm.avoid,
      extras: tcmExtras,
    },
    planner: state.planner,
    highEnergy: state.highEnergy,
    nourish: state.nourish,
    actions,
  };
}

/**
 * 智能推荐：根据当前是工作日 / 周末，推荐一个起始能量态
 */
export function recommendState(ctx = {}) {
  const isWeekend = ctx.isWeekend ?? [0, 6].includes(new Date().getDay());
  const hour = ctx.hour ?? new Date().getHours();
  if (isWeekend) return "rest";
  if (hour >= 22 || hour < 6) return "depleted";
  return "sprint";
}

/**
 * 构建给 LLM 的提示词（用于 AI 深度个性化）
 */
export function buildEnergyLLMPrompt(stateId, ctx, plan) {
  const state = ENERGY_STATES[stateId] || ENERGY_STATES.balance;
  return `你是一位融合中医养生与顶级明星健康规划师经验的 AI 私人健康专家。
用户当前处于「${state.label}」（中医证型：${state.tcmPattern}）。
当前情境：节气「${plan.context.solarTerm}」、天气「${plan.context.weather}」、体质「${plan.context.constitution}」、时段「${plan.context.timeSlot}」、${plan.context.isWeekend ? "周末" : "工作日"}。
请给用户写一段 150–250 字的高度个性化「今日能量与健康处方」：
1) 先用一句比喻点明他现在身体的能量状态；
2) 结合节气/天气/体质，给一条最贴合当下的中医小贴士；
3) 给一条明星规划师式的能量管理动作（具体到今天就能做）；
4) 结尾一句鼓励。语气亲切、像私人顾问在耳边叮嘱，不要列表，用自然段落。`;
}

/**
 * 用 LLM 增强方案（可选，无密钥时返回 null）
 */
export async function enrichWithLLM(stateId, ctx, plan) {
  const config = (await import("./index.js").then((m) => m.loadAgentConfig?.() || null)) || null;
  if (!config || !config.apiKey) return null;
  const prompt = buildEnergyLLMPrompt(stateId, ctx, plan);
  try {
    const reply = await callLLM(
      [
        { role: "system", content: "你是用户的私人高端健康助理，回答简洁、温暖、可执行。" },
        { role: "user", content: prompt },
      ],
      config
    );
    return reply?.content || reply || null;
  } catch (e) {
    return null;
  }
}
