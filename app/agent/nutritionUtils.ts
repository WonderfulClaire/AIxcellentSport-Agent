// app/agent/nutritionUtils.ts
// 营养计算工具函数 —— 从 DietTracker 提取，供组件和测试共用

export type Per100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

export type NutritionResult = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * 根据食物每100g营养成分和实际克数，计算摄入营养
 * calories 四舍五入到整数，protein/carbs/fat 保留一位小数
 */
export function calcFoodNutrition(per100g: Per100g, grams: number): NutritionResult {
  return {
    calories: Math.round(per100g.calories * grams / 100),
    protein: Math.round(per100g.protein * grams / 100 * 10) / 10,
    carbs: Math.round(per100g.carbs * grams / 100 * 10) / 10,
    fat: Math.round(per100g.fat * grams / 100 * 10) / 10,
  };
}

/**
 * 累加多个食物条目的营养数据
 */
export function calcDailyTotals(entries: NutritionResult[]): NutritionResult {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
