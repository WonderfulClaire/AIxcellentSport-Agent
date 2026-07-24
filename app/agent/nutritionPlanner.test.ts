import { describe, it, expect } from "vitest";
import { calcBMR, calcTDEE, calcMacros } from "./nutritionPlanner";

describe("TDEE / BMR 计算 (Mifflin-St Jeor)", () => {
  describe("calcBMR", () => {
    it("男性 70kg/175cm/30岁 → BMR ≈ 1680", () => {
      const bmr = calcBMR({ gender: "male", weight: 70, height: 175, age: 30 });
      // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
      expect(bmr).toBeGreaterThanOrEqual(1600);
      expect(bmr).toBeLessThanOrEqual(1700);
    });

    it("女性 55kg/160cm/25岁 → BMR ≈ 1300", () => {
      const bmr = calcBMR({ gender: "female", weight: 55, height: 160, age: 25 });
      // 10*55 + 6.25*160 - 5*25 - 161 = 550 + 1000 - 125 - 161 = 1264
      expect(bmr).toBeGreaterThanOrEqual(1250);
      expect(bmr).toBeLessThanOrEqual(1350);
    });

    it("男性公式精确验证: 10*w + 6.25*h - 5*a + 5", () => {
      const bmr = calcBMR({ gender: "male", weight: 80, height: 180, age: 25 });
      // 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
      expect(bmr).toBe(1805);
    });

    it("女性公式精确验证: 10*w + 6.25*h - 5*a - 161", () => {
      const bmr = calcBMR({ gender: "female", weight: 60, height: 165, age: 30 });
      // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 → 1320
      expect(bmr).toBe(1320);
    });
  });

  describe("calcTDEE", () => {
    it("TDEE = BMR × 1.2 (sedentary)", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "sedentary")).toBe(Math.round(1650 * 1.2));
    });

    it("TDEE = BMR × 1.375 (light)", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "light")).toBe(Math.round(1650 * 1.375));
    });

    it("TDEE = BMR × 1.55 (moderate)", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "moderate")).toBe(Math.round(1650 * 1.55));
    });

    it("TDEE = BMR × 1.725 (active)", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "active")).toBe(Math.round(1650 * 1.725));
    });

    it("TDEE = BMR × 1.9 (athlete)", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "athlete")).toBe(Math.round(1650 * 1.9));
    });

    it("未知活动等级默认使用 1.55", () => {
      const bmr = 1650;
      expect(calcTDEE(bmr, "unknown")).toBe(Math.round(1650 * 1.55));
    });
  });

  describe("calcMacros", () => {
    it("maintain 模式不调整热量", () => {
      const macros = calcMacros(2000, "maintain", 70);
      expect(macros.calories).toBe(2000);
    });

    it("lose 模式热量减少 20%", () => {
      const macros = calcMacros(2000, "lose", 70);
      expect(macros.calories).toBe(1600);
    });

    it("gain 模式热量增加 10%", () => {
      const macros = calcMacros(2000, "gain", 70);
      expect(macros.calories).toBe(2200);
    });
  });
});
