// app/agent/healthStandards.test.ts
import { describe, it, expect } from "vitest";
import {
  ageFromBirthYear,
  waterTarget,
  stepTarget,
  sleepTarget,
  calorieTarget,
  CUP_ML,
} from "./healthStandards";

describe("healthStandards", () => {
  describe("ageFromBirthYear", () => {
    it("推算年龄", () => {
      const y = new Date().getFullYear();
      expect(ageFromBirthYear(y - 30)).toBe(30);
    });
    it("非法值返回 null", () => {
      expect(ageFromBirthYear(null)).toBeNull();
      expect(ageFromBirthYear(0)).toBeNull();
      expect(ageFromBirthYear(1800)).toBeNull();
    });
  });

  describe("waterTarget 依据膳食指南", () => {
    it("男性基线 1700ml", () => {
      const r = waterTarget({ sex: "male" });
      expect(r.ml).toBeGreaterThanOrEqual(1700);
      expect(r.cups).toBe(Math.round(r.ml / CUP_ML));
    });
    it("女性基线 1500ml", () => {
      const r = waterTarget({ sex: "female" });
      expect(r.ml).toBe(1500);
      expect(r.cups).toBe(6);
    });
    it("按体重 30ml/kg，取较大值", () => {
      // 80kg 男：30*80=2400 > 1700 → 2400
      const r = waterTarget({ sex: "male", weight: 80 });
      expect(r.cups).toBe(Math.round(2400 / CUP_ML)); // 10 杯
    });
    it("运动/高温 +500ml", () => {
      const base = waterTarget({ sex: "female" }).ml;
      const sweat = waterTarget({ sex: "female" }, { sweat: true }).ml;
      expect(sweat).toBeGreaterThan(base);
    });
  });

  describe("stepTarget 依据膳食指南", () => {
    it("成人默认目标 8000、底线 6000", () => {
      const r = stepTarget({ birth_year: new Date().getFullYear() - 30 });
      expect(r.goal).toBe(8000);
      expect(r.min).toBe(6000);
    });
    it("65岁以上目标 6000", () => {
      const r = stepTarget({ birth_year: new Date().getFullYear() - 70 });
      expect(r.goal).toBe(6000);
    });
  });

  describe("sleepTarget", () => {
    it("成人 7-9 小时", () => {
      const r = sleepTarget({ birth_year: new Date().getFullYear() - 30 });
      expect(r.min).toBe(7);
      expect(r.max).toBe(9);
    });
    it("老年 7-8 小时", () => {
      const r = sleepTarget({ birth_year: new Date().getFullYear() - 70 });
      expect(r.max).toBe(8);
    });
  });

  describe("calorieTarget Mifflin-St Jeor", () => {
    it("档案不全时返回 missing", () => {
      const r = calorieTarget({ height: 170 });
      expect(r.ok).toBe(false);
      expect(r.missing).toContain("体重");
      expect(r.missing).toContain("年龄");
    });
    it("男性 BMR 公式正确", () => {
      // 男 175cm 70kg 30岁：10*70+6.25*175-5*30+5 = 700+1093.75-150+5 = 1648.75 → 1649
      const r = calorieTarget({
        sex: "male", height: 175, weight: 70,
        birth_year: new Date().getFullYear() - 30, activity: "light",
      });
      expect(r.ok).toBe(true);
      expect(r.bmr).toBe(1649);
      expect(r.tdee).toBe(Math.round(1649 * 1.375)); // 2267
    });
    it("女性 BMR 公式正确", () => {
      // 女 160cm 55kg 28岁：10*55+6.25*160-5*28-161 = 550+1000-140-161 = 1249
      const r = calorieTarget({
        sex: "female", height: 160, weight: 55,
        birth_year: new Date().getFullYear() - 28, activity: "sedentary",
      });
      expect(r.bmr).toBe(1249);
      expect(r.tdee).toBe(Math.round(1249 * 1.2)); // 1499
    });
    it("减脂目标 -20% 热量", () => {
      const r = calorieTarget({
        sex: "male", height: 175, weight: 70,
        birth_year: new Date().getFullYear() - 30, activity: "light",
        goals: ["减脂塑形"],
      });
      expect(r.goalLabel).toBe("减脂");
      expect(r.target).toBe(Math.round((r.tdee as number) * 0.8));
    });
    it("增肌目标 +10% 热量", () => {
      const r = calorieTarget({
        sex: "male", height: 175, weight: 70,
        birth_year: new Date().getFullYear() - 30, activity: "moderate",
        goals: ["增肌"],
      });
      expect(r.goalLabel).toBe("增肌");
      expect(r.target).toBe(Math.round((r.tdee as number) * 1.1));
    });
    it("宏量总和大致等于目标热量", () => {
      const r = calorieTarget({
        sex: "male", height: 175, weight: 70,
        birth_year: new Date().getFullYear() - 30, activity: "light",
      });
      const kcal = (r.protein as number) * 4 + (r.carbs as number) * 4 + (r.fat as number) * 9;
      // 允许四舍五入误差 ±20 kcal
      expect(Math.abs(kcal - (r.target as number))).toBeLessThan(20);
    });
  });
});
