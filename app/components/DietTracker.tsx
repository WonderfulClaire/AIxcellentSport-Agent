"use client";

import { useCallback, useEffect, useState } from "react";
import { getMeals, saveMeals, getProfile } from "../healthStore";
import ModuleIntro from "./ModuleIntro";

type FoodItem = {
  id: string; name: string; category: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
};

type MealEntry = {
  id: string; foodId: string; foodName: string; grams: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number; protein: number; carbs: number; fat: number;
  timestamp: number;
};

type DailyGoal = { calories: number; protein: number; carbs: number; fat: number };

const MEAL_TYPES: Array<{ key: MealEntry["mealType"]; label: string; icon: string }> = [
  { key: "breakfast", label: "早餐", icon: "🌅" },
  { key: "lunch", label: "午餐", icon: "☀️" },
  { key: "dinner", label: "晚餐", icon: "🌙" },
  { key: "snack", label: "加餐", icon: "🍎" },
];

const DEFAULT_GOAL: DailyGoal = { calories: 2000, protein: 120, carbs: 250, fat: 60 };

export default function DietTracker() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealEntry["mealType"]>("breakfast");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(100);
  const [goal, setGoal] = useState<DailyGoal>(DEFAULT_GOAL);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 加载食物数据库（新格式 with per100g）
  useEffect(() => {
    fetch("/data/foods.json")
      .then((r) => r.json())
      .then((data) => {
        // 支持新格式（对象带 foods 字段）和旧格式（直接数组）
        const list = Array.isArray(data) ? data : (data.foods || []);
        setFoods(list);
      })
      .catch(() => console.error("Failed to load foods"));
  }, []);

  // 从 healthStore 加载今日记录（双通道模式）
  useEffect(() => {
    (async () => {
      try {
        const meals = await getMeals();
        if (meals && meals.length > 0) setEntries(meals);
        // 尝试从 profile 读取目标
        const profile = await getProfile();
        if (profile?.dailyGoal) setGoal(profile.dailyGoal);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // 保存到 healthStore（双通道）
  const persistEntries = useCallback(async (next: MealEntry[]) => {
    setEntries(next);
    try { await saveMeals(next); } catch {}
  }, []);

  // 添加食物
  const addEntry = useCallback(() => {
    if (!selectedFood) return;
    const g = grams;
    const p = selectedFood.per100g;
    const entry: MealEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      grams: g,
      mealType: selectedMeal,
      calories: Math.round(p.calories * g / 100),
      protein: Math.round(p.protein * g / 100 * 10) / 10,
      carbs: Math.round(p.carbs * g / 100 * 10) / 10,
      fat: Math.round(p.fat * g / 100 * 10) / 10,
      timestamp: Date.now(),
    };
    persistEntries([...entries, entry]);
    setSelectedFood(null);
    setGrams(100);
    setSearchQuery("");
  }, [selectedFood, grams, selectedMeal, entries, persistEntries]);

  // 删除记录
  const removeEntry = (id: string) => persistEntries(entries.filter((e) => e.id !== id));

  // 搜索过滤（模糊匹配）
  const filteredFoods = searchQuery.trim()
    ? foods.filter((f) =>
        f.name.includes(searchQuery) ||
        f.category.includes(searchQuery) ||
        f.id.includes(searchQuery.toLowerCase()),
      )
    : [];

  // 汇总数据
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const calDiff = totals.calories - goal.calories;
  const calPct = Math.min(100, Math.round((totals.calories / goal.calories) * 100));

  // 按餐次分组
  const byMeal = MEAL_TYPES.map((m) => ({
    ...m,
    items: entries.filter((e) => e.mealType === m.key),
  }));

  // 示例数据
  const loadDemoData = () => {
    const demoEntries: MealEntry[] = [
      { id: "demo-1", foodId: "egg_boiled", foodName: "鸡蛋（煮）", grams: 100, mealType: "breakfast", calories: 144, protein: 13.3, carbs: 1.4, fat: 8.8, timestamp: Date.now() - 36000000 },
      { id: "demo-2", foodId: "oatmeal", foodName: "燕麦片", grams: 40, mealType: "breakfast", calories: 151, protein: 6, carbs: 26.4, fat: 2.7, timestamp: Date.now() - 35000000 },
      { id: "demo-3", foodId: "chicken_breast", foodName: "鸡胸肉", grams: 150, mealType: "lunch", calories: 200, protein: 46.5, carbs: 0, fat: 5.4, timestamp: Date.now() - 18000000 },
      { id: "demo-4", foodId: "rice_white", foodName: "白米饭", grams: 200, mealType: "lunch", calories: 232, protein: 5.2, carbs: 51.2, fat: 0.6, timestamp: Date.now() - 17500000 },
      { id: "demo-5", foodId: "salmon", foodName: "三文鱼", grams: 120, mealType: "dinner", calories: 167, protein: 24.6, carbs: 0, fat: 7.6, timestamp: Date.now() - 7200000 },
    ];
    persistEntries(demoEntries);
  };

  return (
    <div className="diet-tracker">
      <ModuleIntro
        title="饮食追踪"
        what="记录每餐食物，自动计算热量和营养素摄入"
        how={["搜索食物（支持中文模糊匹配）","输入克数，确认添加","查看当日营养摄入与目标对比"]}
      />
      <div className="dt-header">
        <h2>🥗 饮食管理</h2>
        <p>记录每日饮食，追踪营养摄入（食物库 {foods.length} 种）</p>
      </div>

      {/* 今日概览卡片 */}
      <div className="dt-overview">
        <div className="dt-cal-circle">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(85,200,255,.15)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="var(--acid)" strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - calPct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset .5s ease" }}
            />
          </svg>
          <div className="dt-cal-inner">
            <strong>{totals.calories}</strong>
            <span>/ {goal.calories} kcal</span>
          </div>
        </div>
        <div className="dt-macros">
          <div className="dt-macro-item">
            <span className="dt-macro-label">蛋白质</span>
            <strong>{totals.protein.toFixed(1)}<small>/{goal.protein}g</small></strong>
            <i style={{ width: `${Math.min(100, (totals.protein / goal.protein) * 100)}%` }} />
          </div>
          <div className="dt-macro-item">
            <span className="dt-macro-label">碳水</span>
            <strong>{totals.carbs.toFixed(1)}<small>/{goal.carbs}g</small></strong>
            <i style={{ width: `${Math.min(100, (totals.carbs / goal.carbs) * 100)}%` }} />
          </div>
          <div className="dt-macro-item">
            <span className="dt-macro-label">脂肪</span>
            <strong>{totals.fat.toFixed(1)}<small>/{goal.fat}g</small></strong>
            <i style={{ width: `${Math.min(100, (totals.fat / goal.fat) * 100)}%` }} />
          </div>
          {/* 差距提示 */}
          <div className="dt-gap-hint">
            {calDiff < 0
              ? <span className="dt-gap-under">还差 <b>{Math.abs(calDiff)}</b> 大卡达标</span>
              : calDiff === 0
              ? <span className="dt-gap-ok">🎯 恰好达标！</span>
              : <span className="dt-gap-over">已超出 <b>{calDiff}</b> 大卡</span>
            }
          </div>
        </div>
        <button className="dt-goal-btn" onClick={() => setShowGoalEdit(!showGoalEdit)}>
          ⚙️ 设定目标
        </button>
      </div>

      {/* 目标编辑 */}
      {showGoalEdit && (
        <div className="dt-goal-edit">
          <h4>每日营养目标</h4>
          <div className="dt-goal-grid">
            <label>热量(kcal)<input type="number" value={goal.calories} onChange={(e) => setGoal({ ...goal, calories: Number(e.target.value) })} /></label>
            <label>蛋白质(g)<input type="number" value={goal.protein} onChange={(e) => setGoal({ ...goal, protein: Number(e.target.value) })} /></label>
            <label>碳水(g)<input type="number" value={goal.carbs} onChange={(e) => setGoal({ ...goal, carbs: Number(e.target.value) })} /></label>
            <label>脂肪(g)<input type="number" value={goal.fat} onChange={(e) => setGoal({ ...goal, fat: Number(e.target.value) })} /></label>
          </div>
          <button onClick={() => setShowGoalEdit(false)}>保存目标</button>
        </div>
      )}

      {/* 餐次选择 */}
      <div className="dt-meal-tabs">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.key}
            className={`dt-meal-tab ${selectedMeal === m.key ? "active" : ""}`}
            onClick={() => setSelectedMeal(m.key)}
          >
            <span>{m.icon}</span> {m.label}
            <small>{byMeal.find((b) => b.key === m.key)?.items.length || 0}</small>
          </button>
        ))}
      </div>

      {/* 食物搜索 & 添加 */}
      <div className="dt-add-section">
        <div className="dt-search-row">
          <input
            className="dt-search"
            placeholder="搜索食物（如：鸡胸、牛肉、苹果、红烧肉…）"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }}
          />
        </div>

        {/* 搜索结果 */}
        {searchQuery && filteredFoods.length > 0 && !selectedFood && (
          <div className="dt-food-list">
            {filteredFoods.slice(0, 10).map((f) => (
              <button key={f.id} className="dt-food-item" onClick={() => { setSelectedFood(f); setSearchQuery(f.name); setGrams(100); }}>
                <span className="dt-food-name">{f.name}</span>
                <span className="dt-food-cat">{f.category}</span>
                <span className="dt-food-cals">{f.per100g.calories} kcal/100g</span>
              </button>
            ))}
          </div>
        )}

        {searchQuery && filteredFoods.length === 0 && !selectedFood && (
          <div className="dt-no-result">未找到匹配食物，试试其他关键词</div>
        )}

        {/* 已选食物 - 份量输入 */}
        {selectedFood && (
          <div className="dt-selected-confirm">
            <div className="dt-confirm-info">
              <strong>{selectedFood.name}</strong>
              <span className="dt-confirm-cat">{selectedFood.category}</span>
              <div className="dt-gram-input">
                <label>份量 (克)：</label>
                <input
                  type="number"
                  min="1"
                  value={grams}
                  onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))}
                />
                <span className="dt-gram-presets">
                  {[50, 100, 150, 200, 300].map(g => (
                    <button key={g} className={grams === g ? "active" : ""} onClick={() => setGrams(g)}>{g}g</button>
                  ))}
                </span>
              </div>
              <span className="dt-confirm-nutri">
                {Math.round(selectedFood.per100g.calories * grams / 100)} kcal ·
                蛋白{(selectedFood.per100g.protein * grams / 100).toFixed(1)}g ·
                碳水{(selectedFood.per100g.carbs * grams / 100).toFixed(1)}g ·
                脂肪{(selectedFood.per100g.fat * grams / 100).toFixed(1)}g
              </span>
            </div>
            <div className="dt-confirm-actions">
              <button className="dt-add-btn" onClick={addEntry}>✓ 添加到{MEAL_TYPES.find((m) => m.key === selectedMeal)?.label}</button>
              <button className="dt-cancel-btn" onClick={() => { setSelectedFood(null); setSearchQuery(""); }}>取消</button>
            </div>
          </div>
        )}
      </div>

      {/* 今日记录列表 */}
      <div className="dt-log">
        <h3>📝 今日记录</h3>
        {byMeal.map((meal) => (
          meal.items.length > 0 && (
            <div key={meal.key} className="dt-meal-group">
              <h4>{meal.icon} {meal.label}</h4>
              {meal.items.map((entry) => (
                <div key={entry.id} className="dt-entry">
                  <span className="dt-entry-name">{entry.foodName} <small>{entry.grams}g</small></span>
                  <span className="dt-entry-cals">{entry.calories} kcal</span>
                  <button className="dt-remove" onClick={() => removeEntry(entry.id)}>×</button>
                </div>
              ))}
              <div className="dt-meal-total">
                小计: {meal.items.reduce((s, e) => s + e.calories, 0)} kcal
              </div>
            </div>
          )
        ))}
        {entries.length === 0 && (
          <div className="dt-empty">
            <p>今天还没有记录，开始添加吧 👆</p>
            <button className="dt-demo-btn" onClick={loadDemoData}>加载示例数据体验</button>
          </div>
        )}
      </div>
    </div>
  );
}
