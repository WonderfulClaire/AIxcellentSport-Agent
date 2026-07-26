"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getWearable, getProfile } from "../healthStore";
import { saveDailyWeight, readDailyWeight } from "../agent/dailyLog";
import { getLLMConfig } from "../agent/config";
import { recognizeFoodPhoto, type FoodResult } from "../agent/foodVision";
import { searchFood, getFood, nutritionForGrams, type FoodItem } from "../agent/foodDB";
import {
  waterTarget,
  stepTarget,
  sleepTarget,
  calorieTarget,
  ACTIVITY_OPTIONS,
  CUP_ML,
  type RawProfile,
  type CalorieResult,
} from "../agent/healthStandards";

/* ─────────────── 类型 ─────────────── */

interface WaterLog {
  date: string;       // YYYY-MM-DD
  cups: number;
  lastDrink: number;
}

interface EnergyLevel {
  key: string;
  label: string;
  emoji: string;
  color: string;
  desc: string;
}

interface QuickMeal {
  id: string;
  name: string;
  calories: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  time: string;
  macros?: { protein: number; carbs: number; fat: number };
}

/* ─────────────── 常量 ─────────────── */

const ENERGY_LEVELS: EnergyLevel[] = [
  { key: "high",    label: "精力满满", emoji: "⚡", color: "#D4AF37", desc: "今天要高效产出，适合高强度训练+专注工作" },
  { key: "normal",  label: "平稳状态", emoji: "🌤️", color: "#7CB9E8", desc: "正常节奏，保持规律饮食和适度运动" },
  { key: "rest",    label: "休息恢复", emoji: "🛋️", color: "#98D8C8", desc: "身体需要修复，以拉伸、冥想和早睡为主" },
  { key: "low",     label: "低能量日", emoji: "🔋", color: "#B8A9C9", desc: "允许自己慢下来，做最基本的事就好" },
];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

// 常见食物热量参考值（kcal，常见份量）— 依据《中国食物成分表》第6版 / USDA FoodData Central
const QUICK_FOODS = [
  { name: "米饭(1碗·150g)",    cal: 174, cat: "carbs" },
  { name: "全麦面包(2片)",     cal: 160, cat: "carbs" },
  { name: "面条(1碗·熟250g)",  cal: 280, cat: "carbs" },
  { name: "鸡蛋(1个)",         cal: 78,  cat: "protein" },
  { name: "鸡胸肉(100g)",      cal: 165, cat: "protein" },
  { name: "牛奶(1杯·250ml)",   cal: 160, cat: "protein" },
  { name: "苹果(1个·中)",      cal: 95,  cat: "fruit" },
  { name: "香蕉(1根·中)",      cal: 105, cat: "fruit" },
  { name: "蔬菜沙拉(无酱)",    cal: 50,  cat: "veg" },
  { name: "美式咖啡(黑)",      cal: 5,   cat: "drink" },
];

/* ─────────────── localStorage 工具 ─────────────── */

function lsGet(key: string, fallback: any = null): any {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, val: any): void {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ─────────────── 喝水 ─────────────── */

function getWaterLog(): WaterLog {
  const t = todayKey();
  const all: Record<string, WaterLog> = lsGet("aix_water_v1", {});
  return all[t] || { date: t, cups: 0, lastDrink: 0 };
}
function saveWaterLog(log: WaterLog): void {
  const t = todayKey();
  const all: Record<string, WaterLog> = lsGet("aix_water_v1", {});
  all[t] = log;
  lsSet("aix_water_v1", all);
}

/* ─────────────── 能量目标 ─────────────── */

function getTodayEnergy(): string {
  const t = todayKey();
  const all: Record<string, string> = lsGet("aix_energy_v1", {});
  return all[t] || "normal";
}
function setTodayEnergy(key: string): void {
  const t = todayKey();
  const all: Record<string, string> = lsGet("aix_energy_v1", {});
  all[t] = key;
  lsSet("aix_energy_v1", all);
}

/* ─────────────── 快速饮食记录 ─────────────── */

function getQuickMeals(): QuickMeal[] {
  const t = todayKey();
  const all: Record<string, QuickMeal[]> = lsGet("aix_quickmeals_v1", {});
  return all[t] || [];
}
function addQuickMeal(meal: Omit<QuickMeal, "id">): void {
  const t = todayKey();
  const all: Record<string, QuickMeal[]> = lsGet("aix_quickmeals_v1", {});
  if (!all[t]) all[t] = [];
  all[t].push({ ...meal, id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}` });
  lsSet("aix_quickmeals_v1", all);
}
function removeQuickMeal(id: string): void {
  const t = todayKey();
  const all: Record<string, QuickMeal[]> = lsGet("aix_quickmeals_v1", {});
  if (all[t]) all[t] = all[t].filter(m => m.id !== id);
  lsSet("aix_quickmeals_v1", all);
}

/* ─────────────── 活动水平 ─────────────── */

function getActivity(): string {
  return lsGet("aix_activity_v1", "light");
}
function setActivity(key: string): void {
  lsSet("aix_activity_v1", key);
}

/* 节气 — 动态引入以避免首屏加载引擎 */
async function loadSolarAdvice(): Promise<any> {
  try {
    const mod = await import("../agent/tcmEngine");
    return mod.generateDailyWellnessAdvice({}, {}, "balanced");
  } catch { return null; }
}

/* ─────────────── 主组件 ─────────────── */

/* ── 拍照识别历史（本地 localStorage，跨会话复用常吃食物）── */
const FOOD_HISTORY_KEY = "aix_food_history";
interface FoodHistoryItem { id: string; ts: number; name: string; kcal: number; protein: number; carbs: number; fat: number; }
function loadFoodHistory(): FoodHistoryItem[] {
  try {
    const raw = localStorage.getItem(FOOD_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveFoodHistory(arr: FoodHistoryItem[]) {
  try { localStorage.setItem(FOOD_HISTORY_KEY, JSON.stringify(arr.slice(0, 20))); } catch {}
}
function recordFoodHistory(name: string, kcal: number, macros?: { protein: number; carbs: number; fat: number }) {
  const item: FoodHistoryItem = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    ts: Date.now(),
    name, kcal,
    protein: macros?.protein || 0, carbs: macros?.carbs || 0, fat: macros?.fat || 0,
  };
  const arr = loadFoodHistory().filter((x) => x.name !== name); // 同名去重，更新到最前
  saveFoodHistory([item, ...arr]);
}

export default function TodayDashboard({
  onToModule,
  onLogin,
}: {
  onToModule?: (tab: string) => void;
  onLogin?: () => void;
}) {

  /* ── 状态 ── */
  const [waterLog, setWaterLog] = useState<WaterLog>(getWaterLog);
  const [energyKey, setEnergyKey] = useState<string>(getTodayEnergy);
  const [showEnergyPicker, setShowEnergyPicker] = useState(false);
  const [quickMeals, setQuickMeals] = useState<QuickMeal[]>(getQuickMeals);
  const [showAddFood, setShowAddFood] = useState(false);
  const [toast, setToast] = useState("");
  const [solarInfo, setSolarInfo] = useState<any>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<number>(0);
  const [profile, setProfile] = useState<RawProfile | null>(null);
  const [todayWeight, setTodayWeight] = useState<number | "">(() => readDailyWeight() ?? "");
  const [activityKey, setActivityKey] = useState<string>(getActivity);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const cupRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* ── 拍照识别食物 ── */
  const [showPhotoFlow, setShowPhotoFlow] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [visionResult, setVisionResult] = useState<FoodResult | null>(null);
  const [visionNote, setVisionNote] = useState<string>("");
  const [foodQuery, setFoodQuery] = useState("");
  const [manualSel, setManualSel] = useState<FoodItem | null>(null);
  const [manualGrams, setManualGrams] = useState<number>(100);
  const [editName, setEditName] = useState("");
  const [editKcal, setEditKcal] = useState<number>(0);
  const [editMacros, setEditMacros] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });
  const photoRef = useRef<HTMLInputElement>(null);
  const visionReady = !!getLLMConfig();
  const [foodHistory, setFoodHistory] = useState<FoodHistoryItem[]>(() => loadFoodHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [reAddItem, setReAddItem] = useState<FoodHistoryItem | null>(null);
  const [reAddMult, setReAddMult] = useState<number>(1);

  /* ── 科学标准（基于档案 + 今日能量动态计算）── */
  // 精力满满/高能量日视为运动/高消耗日 → 饮水 +500ml
  const sweatDay = energyKey === "high";
  const p: RawProfile = { ...(profile || {}), activity: activityKey };
  const water = waterTarget(p, { sweat: sweatDay });
  const stepInfo = stepTarget(p);
  const sleepInfo = sleepTarget(p);
  const calInfo: CalorieResult = calorieTarget(p);
  const WATER_GOAL = water.cups;

  /* ── 加载初始数据 ── */
  useEffect(() => {
    loadSolarAdvice().then(setSolarInfo);
    getProfile().then((pr) => setProfile(pr || null)).catch(() => {});
    getWearable().then((w: any[]) => {
      const t = todayKey();
      const today = w?.find((x: any) => x.date === t);
      if (today?.steps) setSteps(today.steps);
      if (today?.workouts) setTodayWorkouts(typeof today.workouts === "number" ? today.workouts : 1);
    }).catch(() => {});
  }, []);

  /* ── 体重快捷记录（写 dailyLog，供趋势/周报读取）── */
  const saveWeight = useCallback((kg: number) => {
    if (!kg || kg < 20 || kg > 300) return;
    saveDailyWeight(kg);
    setTodayWeight(kg);
    showToast(`已记录今日体重 ${kg} kg 📉`);
  }, [showToast]);

  /* ── Toast ── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  /* ── 喝水：点亮一杯 ── */
  const drinkCup = useCallback((idx: number) => {
    if (idx < waterLog.cups) return;
    const next = { ...waterLog, cups: idx + 1, lastDrink: Date.now() };
    setWaterLog(next);
    saveWaterLog(next);
    const el = cupRefs.current[idx];
    if (el) {
      el.classList.add("td-cup-pop");
      window.setTimeout(() => el.classList.remove("td-cup-pop"), 500);
    }
    const remain = WATER_GOAL - (idx + 1);
    if (remain <= 0) showToast("今日饮水目标达成！💧 太棒了");
    else if ((idx + 1) % 4 === 0) showToast(`已喝 ${idx + 1} 杯水，继续加油！`);
    else showToast(`+${CUP_ML}ml 💧`);
  }, [waterLog, WATER_GOAL, showToast]);

  const undoCup = useCallback(() => {
    if (waterLog.cups <= 0) return;
    const next = { ...waterLog, cups: waterLog.cups - 1 };
    setWaterLog(next);
    saveWaterLog(next);
  }, [waterLog]);

  /* ── 能量选择 ── */
  const pickEnergy = useCallback((key: string) => {
    setEnergyKey(key);
    setTodayEnergy(key);
    setShowEnergyPicker(false);
    showToast(`今日状态：${ENERGY_LEVELS.find(e => e.key === key)?.label}`);
  }, [showToast]);

  /* ── 活动水平 ── */
  const pickActivity = useCallback((key: string) => {
    setActivityKey(key);
    setActivity(key);
    setShowActivityPicker(false);
    showToast(`活动水平：${ACTIVITY_OPTIONS.find(a => a.key === key)?.label} · 热量目标已更新`);
  }, [showToast]);

  /* ── 快速加餐 ── */
  const handleAddFood = useCallback((name: string, cal: number, macros?: { protein: number; carbs: number; fat: number }) => {
    const hour = new Date().getHours();
    let mealType: QuickMeal["mealType"] = "snack";
    if (hour < 10) mealType = "breakfast";
    else if (hour < 14) mealType = "lunch";
    else if (hour < 20) mealType = "dinner";
    addQuickMeal({ name, calories: cal, mealType, time: `${String(hour).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`, macros });
    setQuickMeals(getQuickMeals());
    setShowAddFood(false);
    showToast(`已记录：${name}（${cal} kcal）`);
  }, [showToast]);

  /* ── 拍照识别食物 ── */
  const resetPhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
    setRecognizing(false);
    setVisionResult(null);
    setVisionNote("");
    setManualSel(null);
    setFoodQuery("");
    setShowPhotoFlow(false);
  }, [photoPreview]);

  const handlePhotoPicked = useCallback(async (file: File) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRecognizing(true);
    setVisionResult(null);
    setManualSel(null);
    setVisionNote("");
    try {
      const res = await recognizeFoodPhoto(file);
      if (res) {
        setVisionResult(res);
        setEditName(res.name);
        setEditKcal(res.kcal);
        setEditMacros({ protein: res.protein_g, carbs: res.carbs_g, fat: res.fat_g });
      } else {
        setVisionNote(
          visionReady
            ? "AI 没能从这张图识别出来，可以手动选择（下方）。"
            : "未配置 AI 视觉模型，已切换为手动选择（去「设置」填写 LLM 配置后即可自动识别）。"
        );
      }
    } catch {
      setVisionNote("识别出错，请手动选择（下方）。");
    } finally {
      setRecognizing(false);
    }
  }, [photoPreview, visionReady]);

  const selectManualFood = useCallback((f: FoodItem) => {
    setManualSel(f);
    setManualGrams(f.portions[0]?.grams || 100);
  }, []);

  const confirmManual = useCallback(() => {
    if (!manualSel) return;
    const n = nutritionForGrams(manualSel, manualGrams);
    handleAddFood(manualSel.name, n.kcal, { protein: n.protein, carbs: n.carbs, fat: n.fat });
    recordFoodHistory(manualSel.name, n.kcal, { protein: n.protein, carbs: n.carbs, fat: n.fat });
    setFoodHistory(loadFoodHistory());
    resetPhoto();
  }, [manualSel, manualGrams, handleAddFood, resetPhoto]);

  const confirmVision = useCallback(() => {
    const name = editName || "识别食物";
    handleAddFood(name, editKcal, editMacros);
    recordFoodHistory(name, editKcal, editMacros);
    setFoodHistory(loadFoodHistory());
    resetPhoto();
  }, [editName, editKcal, editMacros, handleAddFood, resetPhoto]);

  const handleRemoveMeal = useCallback((id: string) => {
    removeQuickMeal(id);
    setQuickMeals(getQuickMeals());
  }, []);

  const reAddFromHistory = useCallback((h: FoodHistoryItem) => {
    setReAddItem(h);
    setReAddMult(1);
  }, []);

  const confirmReAdd = useCallback(() => {
    if (!reAddItem) return;
    const h = reAddItem;
    const kcal = Math.round(h.kcal * reAddMult);
    const macros = {
      protein: +(h.protein * reAddMult).toFixed(1),
      carbs: +(h.carbs * reAddMult).toFixed(1),
      fat: +(h.fat * reAddMult).toFixed(1),
    };
    handleAddFood(h.name, kcal, macros);
    showToast(`已加入：${h.name}（${kcal} kcal · ${reAddMult}×）`);
    setReAddItem(null);
  }, [reAddItem, reAddMult, handleAddFood, showToast]);

  const clearFoodHistory = useCallback(() => {
    saveFoodHistory([]);
    setFoodHistory([]);
  }, []);

  /* ── 汇总 ── */
  const totalCalories = quickMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = quickMeals.reduce((s, m) => s + (m.macros?.protein || 0), 0);
  const totalCarbs = quickMeals.reduce((s, m) => s + (m.macros?.carbs || 0), 0);
  const totalFat = quickMeals.reduce((s, m) => s + (m.macros?.fat || 0), 0);
  const hasMacro = totalProtein + totalCarbs + totalFat > 0;
  const waterPercent = Math.round((waterLog.cups / WATER_GOAL) * 100);
  const currentEnergy = ENERGY_LEVELS.find(e => e.key === energyKey) || ENERGY_LEVELS[1];
  const now = new Date();
  const dateStr = `${now.getMonth()+1}月${now.getDate()}日 星期${"日一二三四五六"[now.getDay()]}`;
  const calGoal = calInfo.ok ? (calInfo.target as number) : null;
  const calRemain = calGoal !== null ? Math.max(0, calGoal - totalCalories) : null;

  /* ═══════════════ 渲染 ═══════════════ */

  return (
    <div className="today-dashboard">
      {toast && <div className="td-toast">{toast}</div>}

      {/* ====== 头部：日期 + 节气 ====== */}
      <header className="td-header">
        <div className="td-header-top">
          <span className="td-date">{dateStr}</span>
          <button className="td-login-hint" onClick={onLogin}>登录同步 →</button>
        </div>

        {solarInfo?.solarTerm && (
          <div className="td-solar-card">
            <div className="td-solar-left">
              <span className="td-solar-name">{solarInfo.solarTerm.name}</span>
              <span className="td-solar-countdown">
                距「{solarInfo.solarTerm.next || ""}」还有 {solarInfo.solarTerm.daysToNext || "?"} 天
              </span>
            </div>
            <div className="td-solar-right">
              <div className="td-solar-tcm">
                <span className="td-solar-label">养生原则</span>
                <span>{solarInfo.solarTerm.principle || solarInfo.current?.tcm || ""}</span>
              </div>
              {(solarInfo.solarTerm.recommendedDiet || solarInfo.current?.diet) && (
                <div className="td-solar-row">
                  <div className="td-solar-item">
                    <span className="td-solar-label">推荐食材</span>
                    <span>{solarInfo.solarTerm.recommendedDiet || solarInfo.current?.diet || ""}</span>
                  </div>
                  {solarInfo.solarTerm.recommendedExercise && (
                    <div className="td-solar-item">
                      <span className="td-solar-label">推荐运动</span>
                      <span>{solarInfo.solarTerm.recommendedExercise}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="td-weight-quick">
          <span className="td-weight-emoji">⚖️</span>
          <span className="td-weight-label">今日体重</span>
          <input
            className="td-weight-input"
            type="number"
            inputMode="decimal"
            placeholder="--"
            value={todayWeight}
            onChange={(e) => setTodayWeight(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => todayWeight !== "" && saveWeight(Number(todayWeight))}
            onKeyDown={(e) => { if (e.key === "Enter" && todayWeight !== "") saveWeight(Number(todayWeight)); }}
          />
          <span className="td-weight-unit">kg</span>
          <button className="td-weight-save" onClick={() => todayWeight !== "" && saveWeight(Number(todayWeight))}>记录</button>
        </div>
      </header>

      {/* ====== 今日能量目标 ====== */}
      <section className="td-section td-energy-section">
        <div className="td-section-head">
          <h3>今日能量目标</h3>
          <button className="td-change-btn" onClick={() => setShowEnergyPicker(!showEnergyPicker)}>切换</button>
        </div>

        {!showEnergyPicker ? (
          <div className="td-energy-selected" style={{ borderLeftColor: currentEnergy.color }}>
            <span className="td-energy-emoji">{currentEnergy.emoji}</span>
            <div>
              <div className="td-energy-label" style={{ color: currentEnergy.color }}>{currentEnergy.label}</div>
              <div className="td-energy-desc">{currentEnergy.desc}</div>
            </div>
          </div>
        ) : (
          <div className="td-energy-grid">
            {ENERGY_LEVELS.map(e => (
              <button
                key={e.key}
                className={`td-energy-chip ${energyKey === e.key ? "active" : ""}`}
                style={{ borderColor: energyKey === e.key ? e.color : undefined }}
                onClick={() => pickEnergy(e.key)}
              >
                <span className="td-e-emoji">{e.emoji}</span>
                <span className="td-e-label">{e.label}</span>
                <span className="td-e-desc">{e.desc}</span>
              </button>
            ))}
          </div>
        )}

        {solarInfo?.todayTips?.length > 0 && (
          <div className="td-tips-bar">
            <span className="td-tips-icon">💡</span>
            <span>{solarInfo.todayTips[0]}</span>
          </div>
        )}
      </section>

      {/* ====== 喝水打卡 ====== */}
      <section className="td-section td-water-section">
        <div className="td-section-head">
          <h3>喝水打卡 💧</h3>
          <span className="td-water-stat">
            {waterLog.cups}/{WATER_GOAL} 杯 · {waterLog.cups * CUP_ML}/{water.ml}ml
            <span className="td-water-pct" style={{ width: `${Math.min(waterPercent, 100)}%` }} />
          </span>
        </div>

        <div className="td-cups-grid">
          {Array.from({ length: WATER_GOAL }).map((_, i) => {
            const filled = i < waterLog.cups;
            return (
              <div
                key={i}
                ref={el => { cupRefs.current[i] = el; }}
                className={`td-cup ${filled ? "filled" : ""}`}
                onClick={() => filled ? undefined : drinkCup(i)}
                title={filled ? `第 ${i+1} 杯 ✓` : "点击喝一杯"}
              >
                <svg viewBox="0 0 40 44" className="td-cup-svg">
                  <path
                    d="M6 4 h28 l-4 32 c-0.5 4-3 7-10 7 s-9.5-3-10-7 z"
                    className={filled ? "td-cup-fill" : "td-cup-outline"}
                  />
                  {filled && <path d="M14 16 L18 22 L26 12" stroke="#0A0A0B" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
                <span className="td-cup-num">{i + 1}</span>
              </div>
            );
          })}
        </div>

        <div className="td-basis">目标依据：{water.basis}（1 杯≈{CUP_ML}ml）</div>

        {waterLog.cups > 0 && waterPercent < 100 && (
          <button className="td-undo-btn" onClick={undoCup}>撤销一杯</button>
        )}
        {waterPercent >= 100 && (
          <div className="td-water-celebration">今日饮水达标！保持这个好习惯 🎉</div>
        )}
      </section>

      {/* ====== 饮食记录 ====== */}
      <section className="td-section td-diet-section">
        <div className="td-section-head">
          <h3>今日饮食 🍽️</h3>
          <span className="td-cal-total">
            {totalCalories}{calGoal !== null ? ` / ${calGoal}` : ""} kcal
          </span>
        </div>

        {/* 热量目标卡 */}
        {calInfo.ok ? (
          <div className="td-cal-goal-card">
            <div className="td-cal-metrics">
              <div className="td-cal-metric">
                <span className="td-cal-val">{calInfo.bmr}</span>
                <span className="td-cal-lbl">BMR 基础代谢</span>
              </div>
              <div className="td-cal-metric">
                <span className="td-cal-val">{calInfo.tdee}</span>
                <span className="td-cal-lbl">TDEE 日消耗</span>
              </div>
              <div className="td-cal-metric highlight">
                <span className="td-cal-val">{calInfo.target}</span>
                <span className="td-cal-lbl">目标摄入·{calInfo.goalLabel}</span>
              </div>
            </div>
            <div className="td-macro-row">
              <span className="td-macro">蛋白 {calInfo.protein}g</span>
              <span className="td-macro">碳水 {calInfo.carbs}g</span>
              <span className="td-macro">脂肪 {calInfo.fat}g</span>
              <button className="td-activity-btn" onClick={() => setShowActivityPicker(!showActivityPicker)}>
                活动:{calInfo.activityLabel} ⚙
              </button>
            </div>
            {showActivityPicker && (
              <div className="td-activity-grid">
                {ACTIVITY_OPTIONS.map(a => (
                  <button
                    key={a.key}
                    className={`td-activity-chip ${activityKey === a.key ? "active" : ""}`}
                    onClick={() => pickActivity(a.key)}
                  >
                    <span className="td-a-label">{a.label}</span>
                    <span className="td-a-desc">{a.desc}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="td-basis">目标依据：{calInfo.basis}</div>
          </div>
        ) : (
          <div className="td-cal-incomplete">
            <span>完善档案（{calInfo.missing?.join("、")}）即可用 Mifflin-St Jeor 公式算出你的精准热量目标</span>
            <button className="td-mini-btn" onClick={() => onToModule?.("member")}>去完善 →</button>
          </div>
        )}

        {/* 已记录列表 */}
        {quickMeals.length > 0 ? (
          <div className="td-meal-list">
            {quickMeals.map(m => (
              <div key={m.id} className="td-meal-item">
                <span className="td-meal-type">{MEAL_TYPE_LABELS[m.mealType] || "其他"}</span>
                <span className="td-meal-name">{m.name}</span>
                <span className="td-meal-cal">{m.calories} kcal</span>
                <span className="td-meal-time">{m.time}</span>
                <button className="td-meal-del" onClick={() => handleRemoveMeal(m.id)}>×</button>
              </div>
            ))}
            <div className="td-meal-summary">
              共 {quickMeals.length} 项 · {totalCalories} kcal
              {calRemain !== null && (
                <span className="td-goal-gap">还可摄入 {calRemain} kcal</span>
              )}
            </div>
            {hasMacro && (
              <div className="td-macro-tally">
                <span>蛋白 {Math.round(totalProtein)}g</span>
                <span>碳水 {Math.round(totalCarbs)}g</span>
                <span>脂肪 {Math.round(totalFat)}g</span>
                <span className="td-macro-note">（识别食物自动累计）</span>
              </div>
            )}
          </div>
        ) : (
          <div className="td-empty-state">今天还没记录饮食，点击下方添加</div>
        )}

        <div className="td-food-actions">
          <button className="td-action-btn primary" onClick={() => { setShowPhotoFlow(true); setShowAddFood(false); }}>
            📷 拍照识别
          </button>
          <button className="td-action-btn" onClick={() => setShowAddFood(!showAddFood)}>
            + 快速添加
          </button>
          <button className="td-action-btn" onClick={() => onToModule?.("diet")}>详细饮食追踪 →</button>
          <button className="td-action-btn" onClick={() => onToModule?.("nutrition")}>AI 营养订制 →</button>
        </div>

        {showAddFood && (
          <div className="td-food-panel">
            <div className="td-food-panel-head">
              <span>快速选择常见食物</span>
              <button onClick={() => setShowAddFood(false)}>✕</button>
            </div>
            <div className="td-food-grid">
              {QUICK_FOODS.map(f => (
                <button key={f.name} className="td-food-chip" onClick={() => handleAddFood(f.name, f.cal)}>
                  <span className="td-f-name">{f.name}</span>
                  <span className="td-f-cal">{f.cal} kcal</span>
                </button>
              ))}
            </div>
            <div className="td-food-photo-hint">
              热量参考《中国食物成分表》第6版 / USDA · 想更省事点上方「📷 拍照识别」直接拍食物估算热量
            </div>
          </div>
        )}

        {/* ====== 拍照识别食物 ====== */}
        {showPhotoFlow && (
          <div className="td-photo-panel">
            <div className="td-photo-head">
              <span>📷 拍照识别食物</span>
              <div className="td-photo-head-actions">
                <button className="td-photo-hist-btn" onClick={() => setShowHistory(v => !v)}>🕘 历史{foodHistory.length > 0 ? `(${foodHistory.length})` : ""}</button>
                <button className="td-photo-close" onClick={resetPhoto}>✕</button>
              </div>
            </div>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoPicked(f); e.currentTarget.value = ""; }}
            />
            {!photoPreview ? (
              <div className="td-photo-empty">
                <p>拍一张 / 选一张食物照片，自动估算热量与营养</p>
                <button className="td-action-btn primary" onClick={() => photoRef.current?.click()}>选择 / 拍摄照片</button>
                {!visionReady && (
                  <p className="td-photo-tip">当前未配置 AI 视觉模型，识别会自动转为「手动选择」（去「设置」填写 LLM 配置后即可自动 AI 识别）。</p>
                )}
              </div>
            ) : (
              <div className="td-photo-body">
                <img className="td-photo-img" src={photoPreview} alt="食物预览" />
                {recognizing && <div className="td-photo-loading">🔍 AI 识别中…</div>}

                {!recognizing && visionResult && (
                  <div className="td-vision-card">
                    <div className="td-vision-title">AI 识别结果（可修改后添加）</div>
                    <label className="td-vision-field">食物名
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </label>
                    <label className="td-vision-field">热量 (kcal)
                      <input type="number" value={editKcal} onChange={(e) => setEditKcal(Math.max(0, +e.target.value || 0))} />
                    </label>
                    <div className="td-vision-macros">
                      <label>蛋白 g<input type="number" value={editMacros.protein} onChange={(e) => setEditMacros({ ...editMacros, protein: Math.max(0, +e.target.value || 0) })} /></label>
                      <label>碳水 g<input type="number" value={editMacros.carbs} onChange={(e) => setEditMacros({ ...editMacros, carbs: Math.max(0, +e.target.value || 0) })} /></label>
                      <label>脂肪 g<input type="number" value={editMacros.fat} onChange={(e) => setEditMacros({ ...editMacros, fat: Math.max(0, +e.target.value || 0) })} /></label>
                    </div>
                    <div className="td-vision-actions">
                      <button className="td-action-btn primary" onClick={confirmVision}>添加到今日饮食</button>
                      <button className="td-action-btn" onClick={() => photoRef.current?.click()}>换一张</button>
                    </div>
                  </div>
                )}

                {!recognizing && !visionResult && (
                  <div className="td-manual-pick">
                    {visionNote && <p className="td-photo-tip">{visionNote}</p>}
                    <input
                      className="td-food-search"
                      placeholder="搜索食物，如：米饭 / 鸡胸肉 / 苹果"
                      value={foodQuery}
                      onChange={(e) => setFoodQuery(e.target.value)}
                    />
                    <div className="td-food-search-list">
                      {searchFood(foodQuery).map((f) => (
                        <button
                          key={f.name}
                          className={`td-search-item ${manualSel?.name === f.name ? "active" : ""}`}
                          onClick={() => selectManualFood(f)}
                        >
                          <span className="td-si-name">{f.name}</span>
                          <span className="td-si-kcal">{f.kcal100} kcal/100g</span>
                        </button>
                      ))}
                    </div>
                    {manualSel && (
                      <div className="td-manual-detail">
                        <div className="td-portion-row">
                          {manualSel.portions.map((p) => (
                            <button
                              key={p.label}
                              className={`td-portion-chip ${manualGrams === p.grams ? "active" : ""}`}
                              onClick={() => setManualGrams(p.grams)}
                            >{p.label}</button>
                          ))}
                          <label className="td-grams-field">自定义 g
                            <input type="number" value={manualGrams} onChange={(e) => setManualGrams(Math.max(1, +e.target.value || 0))} />
                          </label>
                        </div>
                        <div className="td-manual-kcal">
                          ≈ {nutritionForGrams(manualSel, manualGrams).kcal} kcal
                          （蛋白 {nutritionForGrams(manualSel, manualGrams).protein}g · 碳水 {nutritionForGrams(manualSel, manualGrams).carbs}g · 脂肪 {nutritionForGrams(manualSel, manualGrams).fat}g）
                        </div>
                        <div className="td-vision-actions">
                          <button className="td-action-btn primary" onClick={confirmManual}>添加到今日饮食</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            {showHistory && (
              <div className="td-photo-history">
                <div className="td-hist-head">
                  <span>🕘 识别历史（常吃食物，点一下重新加入今日）</span>
                  {foodHistory.length > 0 && (
                    <button className="td-hist-clear" onClick={clearFoodHistory}>清空</button>
                  )}
                </div>
                {foodHistory.length === 0 ? (
                  <p className="td-hist-empty">还没有识别记录，拍一张食物试试～</p>
                ) : (
                  <div className="td-hist-list">
                    {foodHistory.map((h) => (
                      <div key={h.id} className="td-hist-item">
                        <div className="td-hist-info">
                          <span className="td-hist-name">{h.name}</span>
                          <span className="td-hist-kcal">{h.kcal} kcal{h.protein + h.carbs + h.fat > 0 ? ` · 蛋${h.protein} 碳${h.carbs} 脂${h.fat}` : ""}</span>
                        </div>
                        {reAddItem?.id === h.id ? (
                          <div className="td-hist-readd">
                            <div className="td-hist-mults">
                              {[0.5, 1, 1.5, 2].map((m) => (
                                <button
                                  key={m}
                                  className={reAddMult === m ? "td-mult-btn active" : "td-mult-btn"}
                                  onClick={() => setReAddMult(m)}
                                >{m}×</button>
                              ))}
                            </div>
                            <div className="td-hist-readd-actions">
                              <button className="td-hist-add" onClick={confirmReAdd}>确认加入</button>
                              <button className="td-hist-cancel" onClick={() => setReAddItem(null)}>取消</button>
                            </div>
                          </div>
                        ) : (
                          <button className="td-hist-add" onClick={() => reAddFromHistory(h)}>再次加入</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ====== 运动与活动 ====== */}
      <section className="td-section td-move-section">
        <div className="td-section-head"><h3>运动与活动 🏃</h3></div>

        <div className="td-steps-card">
          <div className="td-steps-left">
            <span className="td-steps-icon">👟</span>
            <div>
              <div className="td-steps-val">{steps !== null ? steps.toLocaleString() : "--"}</div>
              <div className="td-steps-label">今日步数</div>
              <div className="td-steps-workouts">📲 今日手表训练 {todayWorkouts} 次</div>
            </div>
          </div>
          <div className="td-steps-right">
            {steps !== null ? (
              <>
                <div className="td-steps-ring">
                  <svg viewBox="0 0 100 100" className="td-ring-svg">
                    <circle cx="50" cy="50" r="42" className="td-ring-bg" />
                    <circle
                      cx="50" cy="50" r="42"
                      className="td-ring-fill"
                      strokeDasharray={`${Math.min(steps / stepInfo.goal * 264, 264)} 264`}
                    />
                  </svg>
                  <span className="td-ring-pct">{Math.min(Math.round(steps / stepInfo.goal * 100), 100)}%</span>
                </div>
                <span className="td-steps-goal">目标 {stepInfo.goal.toLocaleString()}</span>
              </>
            ) : (
              <div className="td-steps-empty">
                <p>尚未同步运动数据</p>
                <button className="td-sync-btn" onClick={() => onToModule?.("wearable")}>连接手表 / 导入数据 →</button>
              </div>
            )}
          </div>
        </div>
        <div className="td-basis">步数依据：{stepInfo.basis}</div>

        <div className="td-workout-row" style={{ marginTop: 12 }}>
          <button className="td-workout-card" onClick={() => onToModule?.("train")}>
            <span className="td-w-icon">🏋️</span>
            <span className="td-w-label">今日训练计划</span>
            <span className="td-w-desc">按目标生成，每周≥150分钟中等强度</span>
            <span className="td-w-arrow">→</span>
          </button>
          <button className="td-workout-card" onClick={() => onToModule?.("posture")}>
            <span className="td-w-icon">🤳</span>
            <span className="td-w-label">AI 姿态评估</span>
            <span className="td-w-desc">拍照检测体态问题</span>
            <span className="td-w-arrow">→</span>
          </button>
          <button className="td-workout-card" onClick={() => onToModule?.("video")}>
            <span className="td-w-icon">🎬</span>
            <span className="td-w-label">视频动作分析</span>
            <span className="td-w-desc">上传训练视频获取反馈</span>
            <span className="td-w-arrow">→</span>
          </button>
        </div>
      </section>

      {/* ====== 睡眠 ====== */}
      <section className="td-section td-sleep-section">
        <div className="td-section-head">
          <h3>睡眠 😴</h3>
          <span className="td-sleep-target">建议 {sleepInfo.min}-{sleepInfo.max} 小时</span>
        </div>
        <div className="td-sleep-cards">
          <button className="td-sleep-card" onClick={() => onToModule?.("sleep")}>
            <span className="td-sleep-icon">🌙</span>
            <div>
              <div className="td-sleep-label">记录昨晚睡眠</div>
              <div className="td-sleep-desc">入睡/醒来时间、睡眠质量分析</div>
            </div>
            <span className="td-sleep-arrow">→</span>
          </button>
          <button className="td-sleep-card" onClick={() => onToModule?.("tcm")}>
            <span className="td-sleep-icon">🌿</span>
            <div>
              <div className="td-sleep-label">中医节气养生</div>
              <div className="td-sleep-desc">结合节气的个性化养生方案</div>
            </div>
            <span className="td-sleep-arrow">→</span>
          </button>
        </div>
        <div className="td-basis">睡眠依据：{sleepInfo.basis}</div>
      </section>

      {/* ====== 更多功能 ====== */}
      <section className="td-section td-more-section">
        <div className="td-section-head"><h3>更多工具</h3></div>
        <div className="td-more-grid">
          {[
            { icon: "📊", label: "健康趋势", tab: "trends", desc: "30/90天趋势" },
            { icon: "📋", label: "周报", tab: "weekly_report", desc: "本周总结" },
            { icon: "💬", label: "AI 管家", tab: "hub", desc: "私人助手" },
            { icon: "⚡", label: "能量状态", tab: "energy", desc: "精力管理" },
            { icon: "📚", label: "动作库", tab: "library", desc: "动作教学" },
            { icon: "⏱️", label: "训练历史", tab: "history", desc: "过往记录" },
            { icon: "🩺", label: "图片咨询", tab: "image", desc: "AI 分析" },
            { icon: "⚙️", label: "设置", tab: "settings", desc: "偏好配置" },
          ].map(item => (
            <button key={item.tab} className="td-more-chip" onClick={() => onToModule?.(item.tab)}>
              <span className="td-m-icon">{item.icon}</span>
              <span className="td-m-label">{item.label}</span>
              <span className="td-m-desc">{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div style={{ height: "120px" }} />

      {/* ═══════════ 样式 ═══════════ */}
      <style>{`
.today-dashboard {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 16px 80px;
  font-family: -apple-system, "SF Pro Text", "PingFang SC", sans-serif;
  color: var(--ink, #ECE7D8);
  background: var(--bg, #0A0A0B);
  min-height: 100vh;
}
.td-toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #D4AF37, #B8860B);
  color: #0A0A0B; padding: 10px 24px; border-radius: 20px;
  font-size: 14px; font-weight: 700; z-index: 9999;
  animation: tdToastIn .3s ease, tdToastOut .3s ease 1.9s forwards;
  box-shadow: 0 4px 20px rgba(212,175,55,.35);
}
@keyframes tdToastIn { from{opacity:0;top:50px} to{opacity:1;top:60px} }
@keyframes tdToastOut { from{opacity:1} to{opacity:0;top:50px} }

.td-header { margin-bottom: 20px; }
.td-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.td-date { font-size: 18px; font-weight: 800; color: var(--gold, #D4AF37); }
.td-login-hint {
  font-size: 12px; color: var(--muted, #9a958a);
  background: rgba(212,175,55,.08); border: 1px solid rgba(212,175,55,.15);
  padding: 4px 12px; border-radius: 12px; cursor: pointer; transition: all .2s;
}
.td-login-hint:hover { background: rgba(212,175,55,.15); color: var(--gold); }

.td-solar-card {
  background: linear-gradient(145deg, rgba(212,175,55,.07), rgba(212,175,55,.03));
  border: 1px solid rgba(212,175,55,.18); border-radius: 16px;
  padding: 18px 20px; position: relative; overflow: hidden;
}
.td-solar-card::before {
  content: ""; position: absolute; top: -30px; right: -30px;
  width: 100px; height: 100px;
  background: radial-gradient(circle, rgba(212,175,55,.12), transparent 70%); pointer-events: none;
}
.td-solar-left { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.td-solar-name { font-size: 28px; font-weight: 900; color: var(--gold, #D4AF37); letter-spacing: 2px; }
.td-solar-countdown { font-size: 13px; color: var(--muted, #9a958a); }
.td-solar-right { display: flex; flex-direction: column; gap: 8px; }
.td-solar-tcm { display: flex; gap: 8px; font-size: 13px; flex-wrap: wrap; }
.td-solar-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--gold, #D4AF37); opacity: .8; white-space: nowrap;
}
.td-solar-tcm span:last-child { color: var(--ink); }
.td-solar-row { display: flex; gap: 20px; flex-wrap: wrap; }
.td-solar-item { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.td-solar-item span:last-child { color: var(--ink); }

.td-section { margin-bottom: 24px; }
.td-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.td-section-head h3 { font-size: 17px; font-weight: 800; color: var(--ink); margin: 0; }

/* 依据小标注 */
.td-basis {
  font-size: 11px; color: var(--muted, #9a958a); margin-top: 8px;
  padding-left: 2px; opacity: .85; line-height: 1.4;
}
.td-basis::before { content: "📖 "; opacity: .7; }

.td-change-btn {
  font-size: 12px; color: var(--gold); background: none;
  border: 1px solid rgba(212,175,55,.25); padding: 3px 12px; border-radius: 10px; cursor: pointer; transition: all .2s;
}
.td-change-btn:hover { background: rgba(212,175,55,.1); }
.td-energy-selected {
  display: flex; align-items: center; gap: 14px; padding: 16px 18px;
  background: rgba(255,255,255,.03); border-radius: 14px; border-left: 4px solid;
}
.td-energy-emoji { font-size: 32px; }
.td-energy-label { font-size: 18px; font-weight: 800; }
.td-energy-desc { font-size: 13px; color: var(--muted); margin-top: 2px; }
.td-energy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.td-energy-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 10px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; cursor: pointer; transition: all .2s; text-align: center;
}
.td-energy-chip.active { background: rgba(212,175,55,.08); border-width: 2px; }
.td-energy-chip:hover { background: rgba(255,255,255,.06); }
.td-e-emoji { font-size: 26px; }
.td-e-label { font-size: 14px; font-weight: 700; }
.td-e-desc { font-size: 11px; color: var(--muted); line-height: 1.3; }

.td-tips-bar {
  display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 10px 14px;
  background: rgba(212,175,55,.06); border-radius: 10px; font-size: 13px; color: var(--muted);
}
.td-tips-icon { font-size: 16px; }

.td-water-stat { font-size: 13px; color: var(--muted); position: relative; padding: 2px 0 4px; }
.td-water-pct {
  position: absolute; bottom: 0; left: 0; height: 2px;
  background: linear-gradient(90deg, #4AAEE0, #D4AF37); border-radius: 1px; transition: width .5s ease;
}
.td-cups-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
.td-cup {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px;
  border-radius: 12px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  cursor: pointer; transition: all .25s; user-select: none;
}
.td-cup:hover:not(.filled) { background: rgba(74,174,224,.08); border-color: rgba(74,174,224,.2); }
.td-cup.filled { background: rgba(74,174,224,.12); border-color: rgba(74,174,224,.3); }
.td-cup-svg { width: 36px; height: 40px; overflow: visible; }
.td-cup-outline { fill: none; stroke: rgba(255,255,255,.15); stroke-width: 2; transition: fill .3s; }
.td-cup-fill { fill: #4AAEE0; filter: drop-shadow(0 0 6px rgba(74,174,224,.4)); }
.td-cup-num { font-size: 10px; color: var(--muted); font-weight: 600; }
.td-cup.filled .td-cup-num { color: #4AAEE0; }
.td-cup-pop { animation: tdCupPop .45s cubic-bezier(.175,.885,.32,1.275); }
@keyframes tdCupPop {
  0%{transform:scale(1)} 30%{transform:scale(1.25) translateY(-4px)}
  60%{transform:scale(.95) translateY(1px)} 100%{transform:scale(1) translateY(0)}
}
.td-undo-btn {
  font-size: 12px; color: var(--muted); background: none; border: none;
  cursor: pointer; text-decoration: underline; padding: 4px 0; margin-top: 4px;
}
.td-undo-btn:hover { color: var(--ink); }
.td-water-celebration {
  text-align: center; padding: 12px; margin-top: 8px;
  background: linear-gradient(135deg, rgba(212,175,55,.1), rgba(74,174,224,.08));
  border-radius: 12px; font-size: 14px; font-weight: 700; color: var(--gold);
  animation: tdCelebrate .6s ease;
}
@keyframes tdCelebrate { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }

.td-cal-total { font-size: 14px; font-weight: 800; color: var(--gold); }

/* 热量目标卡 */
.td-cal-goal-card {
  background: rgba(255,255,255,.03); border: 1px solid rgba(212,175,55,.12);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;
}
.td-cal-metrics { display: flex; justify-content: space-between; gap: 8px; }
.td-cal-metric { display: flex; flex-direction: column; align-items: center; flex: 1; padding: 6px; border-radius: 10px; }
.td-cal-metric.highlight { background: rgba(212,175,55,.1); }
.td-cal-val { font-size: 20px; font-weight: 900; color: var(--ink); }
.td-cal-metric.highlight .td-cal-val { color: var(--gold); }
.td-cal-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; text-align: center; }
.td-macro-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.td-macro {
  font-size: 12px; color: var(--ink); background: rgba(255,255,255,.04);
  padding: 4px 10px; border-radius: 8px;
}
.td-activity-btn {
  font-size: 11px; color: var(--gold); background: rgba(212,175,55,.08);
  border: 1px solid rgba(212,175,55,.2); padding: 4px 10px; border-radius: 8px;
  cursor: pointer; margin-left: auto;
}
.td-activity-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.td-activity-chip {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px; cursor: pointer; transition: all .15s;
}
.td-activity-chip.active { background: rgba(212,175,55,.1); border-color: rgba(212,175,55,.3); }
.td-a-label { font-size: 12px; font-weight: 700; color: var(--ink); }
.td-a-desc { font-size: 9px; color: var(--muted); }

.td-cal-incomplete {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 12px;
  background: rgba(212,175,55,.05); border: 1px dashed rgba(212,175,55,.2);
  border-radius: 12px; font-size: 12px; color: var(--muted);
}
.td-mini-btn {
  font-size: 12px; color: var(--gold); background: rgba(212,175,55,.1);
  border: 1px solid rgba(212,175,55,.25); padding: 5px 12px; border-radius: 8px;
  cursor: pointer; white-space: nowrap;
}

.td-meal-list { margin-bottom: 12px; }
.td-meal-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: rgba(255,255,255,.02); border-radius: 10px; margin-bottom: 6px; font-size: 13px;
}
.td-meal-type {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--gold); background: rgba(212,175,55,.1); padding: 2px 8px; border-radius: 6px; white-space: nowrap;
}
.td-meal-name { flex: 1; }
.td-meal-cal { font-weight: 700; color: var(--ink); min-width: 65px; text-align: right; }
.td-meal-time { font-size: 11px; color: var(--muted); min-width: 48px; text-align: right; }
.td-meal-del { font-size: 16px; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0 4px; line-height: 1; }
.td-meal-del:hover { color: #E57373; }
.td-meal-summary {
  font-size: 13px; color: var(--muted); padding: 8px 14px; background: rgba(255,255,255,.02);
  border-radius: 8px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;
}
.td-goal-gap { color: var(--gold); font-weight: 600; }
.td-empty-state {
  text-align: center; padding: 20px; color: var(--muted); font-size: 14px;
  background: rgba(255,255,255,.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,.08);
}
.td-food-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.td-action-btn {
  font-size: 13px; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.03); color: var(--ink); cursor: pointer; transition: all .2s;
}
.td-action-btn:hover { background: rgba(255,255,255,.07); }
.td-action-btn.primary {
  background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(212,175,55,.1));
  border-color: rgba(212,175,55,.3); color: var(--gold); font-weight: 700;
}
.td-food-panel {
  margin-top: 12px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; padding: 16px; animation: tdPanelIn .25s ease;
}
@keyframes tdPanelIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
.td-food-panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 700; font-size: 14px; }
.td-food-panel-head button { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; }
.td-food-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.td-food-chip {
  display: flex; justify-content: space-between; align-items: center; padding: 10px 12px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px; cursor: pointer; transition: all .15s; font-size: 13px;
}
.td-food-chip:hover { background: rgba(212,175,55,.1); border-color: rgba(212,175,55,.2); }
.td-f-name { color: var(--ink); }
.td-f-cal { font-weight: 700; color: var(--gold); font-size: 12px; white-space: nowrap; }
.td-food-photo-hint {
  margin-top: 10px; font-size: 11px; color: var(--muted); text-align: center;
  padding: 8px; background: rgba(255,255,255,.02); border-radius: 8px; line-height: 1.4;
}

.td-steps-card {
  display: flex; justify-content: space-between; align-items: center; padding: 16px 18px;
  background: linear-gradient(145deg, rgba(74,174,224,.06), rgba(74,174,224,.02));
  border: 1px solid rgba(74,174,224,.15); border-radius: 14px;
}
.td-steps-left { display: flex; align-items: center; gap: 12px; }
.td-steps-icon { font-size: 28px; }
.td-steps-val { font-size: 28px; font-weight: 900; color: var(--ink); }
.td-steps-label { font-size: 12px; color: var(--muted); }
.td-steps-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.td-steps-ring { position: relative; width: 56px; height: 56px; }
.td-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.td-ring-bg { fill: none; stroke: rgba(255,255,255,.08); stroke-width: 6; }
.td-ring-fill { fill: none; stroke: #4AAEE0; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray .8s ease; filter: drop-shadow(0 0 4px rgba(74,174,224,.3)); }
.td-ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #4AAEE0; }
.td-steps-goal { font-size: 11px; color: var(--muted); }
.td-steps-empty { text-align: center; }
.td-steps-empty p { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
.td-sync-btn {
  font-size: 12px; padding: 6px 14px; border-radius: 10px; background: rgba(212,175,55,.1);
  border: 1px solid rgba(212,175,55,.25); color: var(--gold); cursor: pointer;
}

.td-workout-row { display: flex; flex-direction: column; gap: 8px; }
.td-workout-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px; cursor: pointer; transition: all .2s; text-align: left; width: 100%;
  color: var(--ink); font-family: inherit;
}
.td-workout-card:hover { background: rgba(255,255,255,.06); border-color: rgba(212,175,55,.15); }
.td-w-icon { font-size: 24px; }
.td-w-label { font-size: 14px; font-weight: 700; flex: 1; }
.td-w-desc { font-size: 11px; color: var(--muted); flex: 1; }
.td-w-arrow { color: var(--gold); font-size: 16px; }

.td-sleep-target { font-size: 12px; color: var(--muted); }
.td-sleep-cards { display: flex; flex-direction: column; gap: 8px; }
.td-sleep-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px; cursor: pointer; transition: all .2s; text-align: left; width: 100%;
  color: var(--ink); font-family: inherit;
}
.td-sleep-card:hover { background: rgba(255,255,255,.06); }
.td-sleep-icon { font-size: 24px; }
.td-sleep-label { font-size: 14px; font-weight: 700; }
.td-sleep-desc { font-size: 11px; color: var(--muted); flex: 1; }
.td-sleep-arrow { color: var(--gold); font-size: 16px; margin-left: auto; }

.td-more-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.td-more-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px; cursor: pointer; transition: all .15s; text-align: center;
  color: var(--ink); font-family: inherit;
}
.td-more-chip:hover { background: rgba(255,255,255,.06); border-color: rgba(212,175,55,.12); }
.td-m-icon { font-size: 22px; }
.td-m-label { font-size: 12px; font-weight: 700; }
.td-m-desc { font-size: 10px; color: var(--muted); text-align: center; }

@media (max-width: 400px) {
  .td-solar-name { font-size: 24px; }
  .td-energy-grid { grid-template-columns: 1fr; }
  .td-food-grid { grid-template-columns: 1fr 1fr; }
}
      `}</style>
    </div>
  );
}
