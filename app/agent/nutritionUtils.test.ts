import { describe, it, expect } from "vitest";
import { calcFoodNutrition, calcDailyTotals } from "./nutritionUtils";

describe("营养累加计算", () => {
  describe("calcFoodNutrition", () => {
    it("100g 白米饭 (116kcal/100g) → 116 kcal", () => {
      const rice = { calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 };
      const result = calcFoodNutrition(rice, 100);
      expect(result.calories).toBe(116);
      expect(result.protein).toBe(2.6);
      expect(result.carbs).toBe(25.6);
      expect(result.fat).toBe(0.3);
    });

    it("200g 鸡胸肉 (133kcal/100g) → 266 kcal", () => {
      const chicken = { calories: 133, protein: 31.0, carbs: 0, fat: 3.6 };
      const result = calcFoodNutrition(chicken, 200);
      expect(result.calories).toBe(266);
      expect(result.protein).toBe(62.0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(7.2);
    });

    it("150g 食物的营养按比例缩放", () => {
      const food = { calories: 200, protein: 20, carbs: 30, fat: 10 };
      const result = calcFoodNutrition(food, 150);
      expect(result.calories).toBe(300); // 200 * 1.5
      expect(result.protein).toBe(30);   // 20 * 1.5
      expect(result.carbs).toBe(45);     // 30 * 1.5
      expect(result.fat).toBe(15);       // 10 * 1.5
    });

    it("50g 食物的营养按比例缩放", () => {
      const food = { calories: 100, protein: 10, carbs: 20, fat: 5 };
      const result = calcFoodNutrition(food, 50);
      expect(result.calories).toBe(50);
      expect(result.protein).toBe(5);
      expect(result.carbs).toBe(10);
      expect(result.fat).toBe(2.5);
    });
  });

  describe("calcDailyTotals", () => {
    it("100g白米饭 + 200g鸡胸肉 → 总热量 382kcal", () => {
      const rice = calcFoodNutrition({ calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 }, 100);
      const chicken = calcFoodNutrition({ calories: 133, protein: 31.0, carbs: 0, fat: 3.6 }, 200);
      const totals = calcDailyTotals([rice, chicken]);
      expect(totals.calories).toBe(116 + 266); // 382
      expect(totals.calories).toBe(382);
    });

    it("验证蛋白质累加", () => {
      const rice = calcFoodNutrition({ calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 }, 100);
      const chicken = calcFoodNutrition({ calories: 133, protein: 31.0, carbs: 0, fat: 3.6 }, 200);
      const totals = calcDailyTotals([rice, chicken]);
      expect(totals.protein).toBeCloseTo(2.6 + 62.0, 1);
    });

    it("验证碳水累加", () => {
      const rice = calcFoodNutrition({ calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 }, 100);
      const chicken = calcFoodNutrition({ calories: 133, protein: 31.0, carbs: 0, fat: 3.6 }, 200);
      const totals = calcDailyTotals([rice, chicken]);
      expect(totals.carbs).toBeCloseTo(25.6 + 0, 1);
    });

    it("验证脂肪累加", () => {
      const rice = calcFoodNutrition({ calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 }, 100);
      const chicken = calcFoodNutrition({ calories: 133, protein: 31.0, carbs: 0, fat: 3.6 }, 200);
      const totals = calcDailyTotals([rice, chicken]);
      expect(totals.fat).toBeCloseTo(0.3 + 7.2, 1);
    });

    it("空数组返回全零", () => {
      const totals = calcDailyTotals([]);
      expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it("三项累加正确", () => {
      const entries = [
        { calories: 100, protein: 10, carbs: 20, fat: 5 },
        { calories: 200, protein: 20, carbs: 30, fat: 10 },
        { calories: 150, protein: 15, carbs: 25, fat: 8 },
      ];
      const totals = calcDailyTotals(entries);
      expect(totals.calories).toBe(450);
      expect(totals.protein).toBe(45);
      expect(totals.carbs).toBe(75);
      expect(totals.fat).toBe(23);
    });
  });
});
