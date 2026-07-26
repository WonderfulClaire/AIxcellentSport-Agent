// app/agent/healthStandards.ts
// 科学健康标准计算模块 —— 所有每日目标基于权威指南 + 个人档案动态计算，供 TodayDashboard 等复用。
//
// 依据来源（Evidence base）：
// - 《中国居民膳食指南(2022)》中国营养学会：
//     · 饮水：温和气候、低身体活动，成年男性 1700ml/天、女性 1500ml/天（约合 6-7 杯，1 杯≈250ml）
//     · 步数：主动身体活动最好每天 6000 步；6000-10000 步区间获益，降慢病风险以中等强度为主
//     · 供能比：碳水 50-65%、蛋白质 10-15%、脂肪 20-30%
// - Mifflin-St Jeor Equation (1990)：基础代谢率 BMR 计算的现行金标准
// - 活动系数 (Harris-Benedict/常用 PAL 分级)：1.2 / 1.375 / 1.55 / 1.725 / 1.9
// - 睡眠：National Sleep Foundation (2015) 成人 7-9 小时；中国指南成人 7-8 小时
// - 蛋白质：ACSM/ISSN 运动人群 1.6-2.2 g/kg 体重
// - 步数队列证据：Paluch et al., Lancet Public Health 2022（<60 岁约 8000-10000 步获益趋于饱和；≥60 岁约 6000-8000 步）

export interface RawProfile {
  height?: number | null;   // cm
  weight?: number | null;   // kg
  birth_year?: number | null;
  sex?: string | null;      // "male" | "female" | "男" | "女" | ...
  goals?: string[];
  activity?: string | null; // sedentary | light | moderate | active | athlete
}

export const CUP_ML = 250; // 1 杯 = 250ml（膳食指南换算口径）

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,   // 久坐（办公室、极少运动）
  light: 1.375,     // 轻度（每周 1-3 天轻运动）
  moderate: 1.55,   // 中度（每周 3-5 天运动）
  active: 1.725,    // 高度（每周 6-7 天高强度）
  athlete: 1.9,     // 运动员级（每天高强度 + 体力工作）
};

export const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "久坐", desc: "极少运动" },
  { key: "light", label: "轻度", desc: "每周1-3次" },
  { key: "moderate", label: "中度", desc: "每周3-5次" },
  { key: "active", label: "高度", desc: "每周6-7次" },
];

function isFemale(sex?: string | null): boolean {
  if (!sex) return false;
  const s = String(sex).toLowerCase();
  return s.startsWith("f") || s === "女" || s === "female";
}

/** 由出生年份推算年龄，非法值返回 null */
export function ageFromBirthYear(by?: number | null): number | null {
  if (!by) return null;
  const a = new Date().getFullYear() - by;
  return a > 0 && a < 120 ? a : null;
}

/* ─────────────── 饮水目标 ─────────────── */
/**
 * 依据《中国居民膳食指南2022》基线（男1700/女1500ml），
 * 有体重时取 max(指南基线, 30ml/kg)；运动日/高温可 +500ml。
 */
export function waterTarget(
  p: RawProfile,
  opts?: { sweat?: boolean },
): { ml: number; cups: number; basis: string } {
  const female = isFemale(p.sex);
  let base = female ? 1500 : 1700;
  let byWeight = false;
  if (p.weight && p.weight > 0) {
    const w = Math.round(p.weight * 30);
    if (w > base) { base = w; byWeight = true; }
  }
  if (opts?.sweat) base += 500;
  const cups = Math.max(4, Math.round(base / CUP_ML));
  const basis =
    "《中国居民膳食指南2022》" +
    (byWeight ? " · 30ml/kg体重" : female ? " · 女性1500ml" : " · 男性1700ml") +
    (opts?.sweat ? " · 运动/高温+500ml" : "");
  return { ml: cups * CUP_ML, cups, basis };
}

/* ─────────────── 步数目标 ─────────────── */
/**
 * 膳食指南主动活动 6000 步为循证底线；<65 岁默认 8000（获益更优），≥65 岁 6000。
 */
export function stepTarget(p: RawProfile): { goal: number; min: number; basis: string } {
  const age = ageFromBirthYear(p.birth_year);
  if (age && age >= 65) {
    return { goal: 6000, min: 6000, basis: "膳食指南·老年主动活动 6000 步" };
  }
  return { goal: 8000, min: 6000, basis: "膳食指南 6000 步循证底线 · 8000 步获益更优" };
}

/* ─────────────── 睡眠目标 ─────────────── */
export function sleepTarget(p: RawProfile): { min: number; max: number; basis: string } {
  const age = ageFromBirthYear(p.birth_year);
  if (age && age >= 65) return { min: 7, max: 8, basis: "老年人 7-8 小时" };
  return { min: 7, max: 9, basis: "National Sleep Foundation 成人 7-9 小时" };
}

/* ─────────────── 热量 & 宏量目标（Mifflin-St Jeor TDEE）─────────────── */
export interface CalorieResult {
  ok: boolean;
  bmr?: number;
  tdee?: number;
  target?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  goalLabel?: string;
  activityLabel?: string;
  basis: string;
  missing?: string[];
}

export function calorieTarget(p: RawProfile): CalorieResult {
  const age = ageFromBirthYear(p.birth_year);
  const missing: string[] = [];
  if (!p.height) missing.push("身高");
  if (!p.weight) missing.push("体重");
  if (!age) missing.push("年龄");
  if (missing.length) return { ok: false, basis: "Mifflin-St Jeor 公式", missing };

  const female = isFemale(p.sex);
  const w = p.weight as number;
  const h = p.height as number;
  const a = age as number;

  // BMR — Mifflin-St Jeor
  const bmr = Math.round(female ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5);

  // TDEE
  const actKey = p.activity && ACTIVITY_FACTORS[p.activity] ? p.activity : "light";
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[actKey]);
  const activityLabel = ACTIVITY_OPTIONS.find((o) => o.key === actKey)?.label || "轻度";

  // 目标映射
  const goalsStr = (p.goals || []).join(" ");
  let goal: "lose" | "gain" | "maintain" = "maintain";
  if (/减脂|减重|瘦|塑形|燃脂|fat|lose/i.test(goalsStr)) goal = "lose";
  else if (/增肌|增重|肌肉|muscle|gain|bulk/i.test(goalsStr)) goal = "gain";
  const goalLabel = goal === "lose" ? "减脂" : goal === "gain" ? "增肌" : "维持";

  let target = tdee;
  if (goal === "lose") target = Math.round(tdee * 0.8); // -20%
  else if (goal === "gain") target = Math.round(tdee * 1.1); // +10%

  // 宏量：蛋白 1.6-2.0 g/kg；脂肪 25-27% 热量；碳水剩余
  const proteinPerKg = goal === "maintain" ? 1.6 : 2.0;
  const protein = Math.round(w * proteinPerKg);
  const fatPct = goal === "lose" ? 0.25 : 0.27;
  const fat = Math.round((target * fatPct) / 9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  return {
    ok: true,
    bmr,
    tdee,
    target,
    protein,
    carbs,
    fat,
    goalLabel,
    activityLabel,
    basis: "Mifflin-St Jeor 公式 + 活动系数",
  };
}
