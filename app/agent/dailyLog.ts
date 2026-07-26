// app/agent/dailyLog.ts
// 统一每日健康日志聚合层。
//
// 项目的健康数据原本散落在多处：
//   - 今日面板：aix_water_v1 / aix_quickmeals_v1 / aix_energy_v1（localStorage 按日期）
//   - 睡眠模块：aix_sleep_v1（SleepTracker，独立 localStorage）
//   - 远端/手表：healthStore.getWearable()（步数/心率/睡眠/训练次数）
//   - 档案打卡：healthStore.getRecords()（体重/睡眠等 checkIn）
//   - 体重快捷记录：aix_daily_weight_v1（本层新增）
// 这份割裂导致「健康趋势」「每周报告」读不到用户在今日面板里记的饮水/饮食/睡眠。
//
// 本模块把所有来源按日期聚合为 DailyLogEntry[]，供趋势图、周报、今日面板统一消费。

import { getWearable, getRecords } from "../healthStore";

export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  weight?: number; // 体重 kg
  restingHr?: number; // 静息心率 bpm
  sleepHours?: number; // 睡眠时长 h
  steps?: number; // 步数
  waterMl?: number; // 饮水 ml
  calories?: number; // 饮食热量 kcal
  protein?: number; // 蛋白 g
  carbs?: number; // 碳水 g
  fat?: number; // 脂肪 g
  workouts?: number; // 训练次数
  energy?: string; // 精力状态 key
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ───────── 体重：本地快捷记录（今日面板写入，供趋势/周报读取）───────── */
const WEIGHT_KEY = "aix_daily_weight_v1";

export function readDailyWeight(date: string = todayKey()): number | null {
  const all = lsGet<Record<string, number>>(WEIGHT_KEY, {});
  return typeof all[date] === "number" ? all[date] : null;
}

export function saveDailyWeight(kg: number, date: string = todayKey()): void {
  const all = lsGet<Record<string, number>>(WEIGHT_KEY, {});
  all[date] = kg;
  try {
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota errors */
  }
}

/* 兼容不同睡眠记录结构的时长提取 */
function sleepHoursOf(rec: any): number | undefined {
  if (typeof rec?.durationHours === "number") return rec.durationHours;
  if (typeof rec?.sleep_hours === "number") return rec.sleep_hours;
  if (rec?.bedTime && rec?.wakeTime) {
    const [bh, bm] = rec.bedTime.split(":").map(Number);
    const [wh, wm] = rec.wakeTime.split(":").map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 10) * 10) / 10 / 6; // 分钟 → 小时（保留 0.1）
  }
  return undefined;
}

/* 聚合最近 days 天的每日日志（按日期升序返回 daily 长度的数组） */
export async function getDailyLog(days = 30): Promise<DailyLogEntry[]> {
  const DAY = 86400000;
  const now = Date.now();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10));
  }
  const map = new Map<string, DailyLogEntry>();
  dates.forEach((d) => map.set(d, { date: d }));

  // 1) 今日面板：喝水（250ml/杯）
  const waterAll = lsGet<Record<string, { cups: number }>>("aix_water_v1", {});
  dates.forEach((d) => {
    const w = waterAll[d];
    if (w && w.cups) map.get(d)!.waterMl = w.cups * 250;
  });

  // 2) 今日面板：饮食（热量 + 宏量）
  const mealsAll = lsGet<Record<string, any[]>>("aix_quickmeals_v1", {});
  dates.forEach((d) => {
    const ms = mealsAll[d] || [];
    if (ms.length) {
      const e = map.get(d)!;
      e.calories = ms.reduce((s: number, m: any) => s + (m.calories || 0), 0);
      e.protein = +ms.reduce((s: number, m: any) => s + (m.protein || 0), 0).toFixed(1);
      e.carbs = +ms.reduce((s: number, m: any) => s + (m.carbs || 0), 0).toFixed(1);
      e.fat = +ms.reduce((s: number, m: any) => s + (m.fat || 0), 0).toFixed(1);
    }
  });

  // 3) 今日面板：精力状态
  const energyAll = lsGet<Record<string, string>>("aix_energy_v1", {});
  dates.forEach((d) => {
    const en = energyAll[d];
    if (en) map.get(d)!.energy = en;
  });

  // 4) 睡眠（SleepTracker）
  const sleepAll = lsGet<any[]>("aix_sleep_v1", []);
  sleepAll.forEach((s) => {
    if (!s.date) return;
    const e = map.get(s.date);
    if (!e) return;
    const h = sleepHoursOf(s);
    if (h != null) e.sleepHours = e.sleepHours ?? h;
  });

  // 5) 体重：本地优先
  const weightAll = lsGet<Record<string, number>>(WEIGHT_KEY, {});
  dates.forEach((d) => {
    if (typeof weightAll[d] === "number") map.get(d)!.weight = weightAll[d];
  });

  // 6) 手表 / 远端（最权威的步数、心率、训练次数）
  let wearable: any[] = [];
  let records: any[] = [];
  try {
    [wearable, records] = await Promise.all([getWearable(), getRecords()]);
  } catch {
    /* 离线/未登录：忽略，仅用本地数据 */
  }
  wearable.forEach((w) => {
    if (!w.date) return;
    const e = map.get(w.date);
    if (!e) return;
    if (w.steps) e.steps = w.steps;
    if (w.resting_hr || w.avg_hr) e.restingHr = e.restingHr ?? (w.resting_hr || w.avg_hr);
    if (w.sleep_hours) e.sleepHours = e.sleepHours ?? w.sleep_hours;
    const wo = typeof w.workouts === "number" ? w.workouts : w.workouts ? 1 : 0;
    if (wo) e.workouts = (e.workouts || 0) + wo;
  });
  records.forEach((r) => {
    if (!r.date) return;
    const e = map.get(r.date);
    if (!e) return;
    if (r.weight) e.weight = e.weight ?? r.weight;
    if (r.sleep_hours) e.sleepHours = e.sleepHours ?? r.sleep_hours;
  });

  return dates.map((d) => map.get(d)!);
}

/* 把 DailyLogEntry[] 转成 WeeklyReport.computeStats 期望的 legacy 输入 [records, wearable] */
export function dailyToLegacy(daily: DailyLogEntry[]): [any[], any[]] {
  const records = daily
    .filter((e) => e.weight != null || e.sleepHours != null)
    .map((e) => ({
      date: e.date,
      weight: e.weight,
      sleep_hours: e.sleepHours,
      training_load: e.workouts ? e.workouts * 35 : 0,
    }));
  const wearable = daily
    .filter((e) => e.steps != null || e.restingHr != null)
    .map((e) => ({ date: e.date, steps: e.steps, resting_hr: e.restingHr }));
  return [records, wearable];
}
