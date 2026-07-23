"use client";

import { useCallback, useEffect, useState } from "react";

type Food = {
  id: string; name: string; category: string;
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  unit: string; portionGrams: number;
};

type MealEntry = {
  id: string; foodId: string; foodName: string; amount: number;
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

const STORAGE_KEY = "aix_diet_v1";

export default function DietTracker() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealEntry["mealType"]>("breakfast");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState(1);
  const [goal, setGoal] = useState<DailyGoal>({ calories: 2000, protein: 120, carbs: 250, fat: 60 });
  const [showGoalEdit, setShowGoalEdit] = useState(false);

  // 加载食物数据库
  useEffect(() => {
    fetch("/data/foods.json")
      .then((r) => r.json())
      .then(setFoods)
      .catch(() => console.error("Failed to load foods"));
  }, []);

  // 从 localStorage 加载今日记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // 只加载今天的记录
        const today = new Date().toDateString();
        setEntries((data.entries || []).filter((e: MealEntry) => new Date(e.timestamp).toDateString() === today));
        if (data.goal) setGoal(data.goal);
      }
    } catch {}
  }, []);

  // 保存到 localStorage
  const saveEntries = useCallback((next: MealEntry[]) => {
    setEntries(next);
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      existing.entries = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {}
  }, []);

  // 添加食物
  const addEntry = useCallback(() => {
    if (!selectedFood) return;
    const entry: MealEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      amount,
      mealType: selectedMeal,
      calories: Math.round(selectedFood.calories * selectedFood.portionGrams / 100 * amount),
      protein: Math.round(selectedFood.protein * selectedFood.portionGrams / 100 * amount * 10) / 10,
      carbs: Math.round(selectedFood.carbs * selectedFood.portionGrams / 100 * amount * 10) / 10,
      fat: Math.round(selectedFood.fat * selectedFood.portionGrams / 100 * amount * 10) / 10,
      timestamp: Date.now(),
    };
    saveEntries([...entries, entry]);
    setSelectedFood(null);
    setAmount(1);
    setSearchQuery("");
  }, [selectedFood, amount, selectedMeal, entries, saveEntries]);

  // 删除记录
  const removeEntry = (id: string) => saveEntries(entries.filter((e) => e.id !== id));

  // 搜索过滤
  const filteredFoods = foods.filter(
    (f) =>
      f.name.includes(searchQuery) ||
      f.category.includes(searchQuery) ||
      f.id.includes(searchQuery),
  );

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

  const calPct = Math.min(100, Math.round((totals.calories / goal.calories) * 100));

  // 按餐次分组
  const byMeal = MEAL_TYPES.map((m) => ({
    ...m,
    items: entries.filter((e) => e.mealType === m.key),
  }));

  return (
    <div className="diet-tracker">
      <div className="dt-header">
        <h2>🥗 饮食管理</h2>
        <p>记录每日饮食，追踪营养摄入</p>
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
          <button onClick={() => {
            setShowGoalEdit(false);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, goal })); } catch {}
          }}>保存目标</button>
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
            placeholder="搜索食物（如：鸡胸、鸡蛋、米饭…）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="dt-amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
            {[0.5, 1, 1.5, 2, 3].map((n) => (
              <option key={n} value={n}>{n}份</option>
            ))}
          </select>
        </div>

        {/* 搜索结果 */}
        {searchQuery && filteredFoods.length > 0 && !selectedFood && (
          <div className="dt-food-list">
            {filteredFoods.slice(0, 8).map((f) => (
              <button key={f.id} className="dt-food-item" onClick={() => { setSelectedFood(f); setSearchQuery(""); }}>
                <span className="dt-food-name">{f.name}</span>
                <span className="dt-food-cat">{f.category}</span>
                <span className="dt-food-cals">{Math.round(f.calories * f.portionGrams / 100)} kcal/{f.unit}</span>
              </button>
            ))}
          </div>
        )}

        {/* 已选食物确认 */}
        {selectedFood && (
          <div className="dt-selected-confirm">
            <div className="dt-confirm-info">
              <strong>{selectedFood.name}</strong>
              <span>{amount} × {selectedFood.unit} = {Math.round(selectedFood.calories * selectedFood.portionGrams / 100 * amount)} kcal</span>
              <span className="dt-confirm-nutri">
                蛋白{Math.round(selectedFood.protein * selectedFood.portionGrams / 100 * amount)}g ·
                碳水{Math.round(selectedFood.carbs * selectedFood.portionGrams / 100 * amount)}g ·
                脂肪{Math.round(selectedFood.fat * selectedFood.portionGrams / 100 * amount)}g
              </span>
            </div>
            <div className="dt-confirm-actions">
              <button className="dt-add-btn" onClick={addEntry}>✓ 添加到{MEAL_TYPES.find((m) => m.key === selectedMeal)?.label}</button>
              <button className="dt-cancel-btn" onClick={() => setSelectedFood(null)}>取消</button>
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
                  <span className="dt-entry-name">{entry.foodName}{entry.amount > 1 ? ` ×${entry.amount}` : ""}</span>
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
        {entries.length === 0 && <p className="dt-empty">今天还没有记录，开始添加吧 👆</p>}
      </div>
    </div>
  );
}
