// app/agent/nutritionPlanner.js
// 私人营养引擎：对标明星营养师 —— 营养画像 → 宏量目标 → AI周饮食方案 → 补剂/抗炎/周期/购物清单

import { callLLM } from "./coachAgent.js";

/**
 * 计算基础代谢率 (BMR) - Mifflin-St Jeor 公式
 */
export function calcBMR(profile) {
  const { gender, weight, height, age } = profile;
  if (gender === "female") {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

/**
 * 计算每日总能量消耗 (TDEE)
 */
export function calcTDEE(bmr, activityLevel) {
  const factors = {
    sedentary: 1.2,      // 久坐
    light: 1.375,        // 轻度活动
    moderate: 1.55,      // 中度活动
    active: 1.725,       // 高度活动
    athlete: 1.9,        // 运动员级
  };
  return Math.round(bmr * (factors[activityLevel] || 1.55));
}

/**
 * 根据目标调整热量并分配宏量营养素
 */
export function calcMacros(tdee, goal) {
  let calories = tdee;
  if (goal === "lose") calories = Math.round(tdee * 0.8);      // 减脂 -20%
  else if (goal === "gain") calories = Math.round(tdee * 1.1); // 增肌 +10%
  // maintain 维持不变

  // 蛋白质: 1.6-2.2 g/kg
  const proteinPerKg = goal === "gain" ? 2.0 : 1.8;
  const protein = Math.round(28 * proteinPerKg); // 假设56kg基准，实际应传入weight
  const proteinCal = protein * 4;

  // 脂肪: 25-30% 热量
  const fatCal = Math.round(calories * 0.27);
  const fat = Math.round(fatCal / 9);

  // 碳水: 剩余
  const carbCal = calories - proteinCal - fatCal;
  const carbs = Math.round(carbCal / 4);

  return { calories, protein, carbs, fat };
}

/**
 * 女性周期营养阶段（基于28天周期）
 */
export function getCyclePhase(cycleDay) {
  if (!cycleDay) return null;
  if (cycleDay <= 5) return { phase: "经期", desc: "铁质补充，温补舒缓", focus: "补铁、镁、温热食物" };
  if (cycleDay <= 13) return { phase: "卵泡期", desc: "能量上升，适合高强度训练", focus: "高蛋白、复合碳水" };
  if (cycleDay <= 16) return { phase: "排卵期", desc: "代谢峰值，燃脂效率高", focus: "足量碳水支撑训练" };
  return { phase: "黄体期", desc: "易水肿 craving，控糖稳情绪", focus: "控糖、补镁、优质脂肪" };
}

/**
 * 生成完整营养方案（调用 LLM）
 */
export async function generateNutritionPlan(profile) {
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activity);
  const macros = calcMacros(tdee, profile.goal);
  const cycle = profile.gender === "female" ? getCyclePhase(profile.cycleDay) : null;

  const prompt = `你是**一线明星的私人营养师**（曾服务多位 A 咖艺人、超模）。请基于以下用户画像，生成一份专业、可执行、像给明星做的个性化营养方案。

## 用户画像
- 性别: ${profile.gender === "female" ? "女" : "男"}
- 年龄: ${profile.age}岁
- 身高: ${profile.height}cm，体重: ${profile.weight}kg
- 活动水平: ${profile.activity === "sedentary" ? "久坐" : profile.activity === "light" ? "轻度" : profile.activity === "moderate" ? "中度" : profile.activity === "active" ? "高度" : "运动员级"}
- 目标: ${profile.goal === "lose" ? "减脂塑形" : profile.goal === "gain" ? "增肌" : "维持健康"}
- 饮食偏好: ${profile.diet || "无特殊"}
- 忌口/过敏: ${profile.restrictions || "无"}
- 健康状况: ${profile.conditions || "健康"}
${cycle ? `- 生理周期: 第${profile.cycleDay}天 (${cycle.phase} - ${cycle.focus})` : ""}

## 计算基础
- BMR (基础代谢): ${bmr} kcal
- TDEE (每日总消耗): ${tdee} kcal
- 目标热量: ${macros.calories} kcal
- 宏量分配: 蛋白质 ${macros.protein}g / 碳水 ${macros.carbs}g / 脂肪 ${macros.fat}g

## 输出要求（严格 JSON）
{
  "summary": "一句话方案理念（明星营养师口吻，鼓励+专业，40字内）",
  "principles": ["3-5条核心饮食原则（如'每4小时蛋白-碳水组合'、'抗炎优先'）"],
  "weeklyPlan": {
    "周一": {"breakfast": "餐名+核心食材", "lunch": "...", "dinner": "...", "snack": "..."},
    "周二": {...}, "周三": {...}, "周四": {...}, "周五": {...}, "周六": {...}, "周日": {...}
  },
  "supplements": ["补剂建议1（如鱼油/维生素D/镁）", "补剂2", "补剂3"],
  "antiInflammatory": ["抗炎食材/习惯1", "抗炎食材/习惯2"],
  "skinGlow": ["美肌营养建议1（胶原蛋白/抗氧化）", "美肌营养建议2"],
  "cycleNutrition": ${cycle ? `"${cycle.phase}专属建议：..."` : "null"},
  "groceryList": ["购物清单分类：蔬菜/蛋白/主食/其他，每类3-5项"],
  "eventPrep": "如果有重要场合（如拍照/约会前7天），给出速塑建议（无则写'日常维持即可'）",
  "tips": ["日常执行小贴士1", "小贴士2"]
}`;

  try {
    const response = await callLLM(prompt, { temperature: 0.5 });
    const jsonStr = extractJSON(response);
    if (jsonStr) {
      const plan = JSON.parse(jsonStr);
      return { ...plan, bmr, tdee, macros, cycle };
    }
    throw new Error("格式异常");
  } catch (err) {
    console.warn("Nutrition LLM failed:", err);
    return generateFallbackPlan(profile, { bmr, tdee, macros, cycle });
  }
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}$/);
  if (match) {
    try { return match[0]; } catch {}
  }
  return null;
}

function generateFallbackPlan(profile, calc) {
  const { macros, cycle } = calc;
  return {
    summary: `根据你的目标，每日${macros.calories}kcal、蛋白质${macros.protein}g，均衡抗炎饮食。`,
    principles: ["每4小时一餐，蛋白+复合碳水组合", "优先全食物、少加工", "抗炎优先，补充Omega-3"],
    weeklyPlan: generateBasicWeek(macros),
    supplements: ["鱼油 (Omega-3)", "维生素D3", "镁"],
    antiInflammatory: ["深海鱼、姜黄、蓝莓", "减少精制糖和反式脂肪"],
    skinGlow: ["胶原蛋白肽", "维生素C+抗氧化蔬果"],
    cycleNutrition: cycle ? `${cycle.phase}：注意${cycle.focus}` : null,
    groceryList: ["鸡胸肉/三文鱼", "西兰花/菠菜", "糙米/燕麦", "坚果/牛油果"],
    eventPrep: "日常维持即可，特殊场合前可减少钠摄入控水肿。",
    tips: ["多喝水", "规律作息", "餐前喝温水"],
  };
}

function generateBasicWeek(macros) {
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const p = Math.round(macros.protein / 3);
  const c = Math.round(macros.carbs / 3);
  const f = Math.round(macros.fat / 3);
  const template = (main) => ({
    breakfast: `燕麦${Math.round(c*0.3)}g + 鸡蛋2个 + 蓝莓 (蛋白${p}g)`,
    lunch: `${main} + 糙米${Math.round(c*0.4)}g + 西兰花 (蛋白${p}g)`,
    dinner: `清蒸鱼/鸡胸${Math.round(p*0.4)}g + 时蔬 + 橄榄油${Math.round(f*0.3)}g`,
    snack: `希腊酸奶 + 坚果${Math.round(f*0.2)}g`,
  });
  const mains = ["鸡胸肉", "三文鱼", "牛肉", "虾", "豆腐", "鸡腿肉", "鳕鱼"];
  const plan = {};
  days.forEach((d, i) => plan[d] = template(mains[i]));
  return plan;
}

/**
 * 特殊场合速塑方案（如红毯/拍摄前）
 */
export async function generateEventPrep(eventType, days = 7) {
  const prompt = `你是明星红毯前的紧急塑形营养师。用户将在${days}天后参加「${eventType}」。
请生成一份${days}天速塑饮食方案（控水消肿、提亮肤质、维持能量），严格JSON：
{
  "goal": "速塑目标简述",
  "dailyTips": ["第1-2天: ...", "第3-4天: ...", "第5-7天: ..."],
  "avoid": ["避免食物1", "避免食物2"],
  "boost": ["推荐食物1（消肿/亮肤）", "推荐食物2"],
  "supplements": ["短期补剂1", "补剂2"]
}`;
  try {
    const r = await callLLM(prompt, { temperature: 0.5 });
    const j = extractJSON(r);
    return j ? JSON.parse(j) : null;
  } catch {
    return { goal: `${days}天轻断食控钠消肿`, dailyTips: ["前3天低碳控钠", "后几天高蛋白亮肤"], avoid: ["高钠加工食品", "酒精"], boost: ["黄瓜/芹菜", "柠檬水"], supplements: ["镁", "钾"] };
  }
}
