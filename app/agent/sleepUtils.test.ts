import { describe, it, expect } from "vitest";
import { bedTimeToMinutes, stdDev } from "./sleepUtils";

describe("睡眠规律性计算", () => {
  describe("bedTimeToMinutes", () => {
    it("22:30 → 22*60+30 = 1350", () => {
      expect(bedTimeToMinutes("22:30")).toBe(1350);
    });

    it("23:00 → 1380", () => {
      expect(bedTimeToMinutes("23:00")).toBe(1380);
    });

    it("00:30 (凌晨, <6:00) → 30 + 1440 = 1470", () => {
      expect(bedTimeToMinutes("00:30")).toBe(1470);
    });

    it("01:00 (凌晨) → 60 + 1440 = 1500", () => {
      expect(bedTimeToMinutes("01:00")).toBe(1500);
    });

    it("05:59 (凌晨边界) → 359 + 1440 = 1799", () => {
      expect(bedTimeToMinutes("05:59")).toBe(1799);
    });

    it("06:00 (早晨起点) → 360 (不加1440)", () => {
      expect(bedTimeToMinutes("06:00")).toBe(360);
    });
  });

  describe("stdDev", () => {
    it("固定入睡时间数组 [1380, 1380, 1380] → σ=0", () => {
      expect(stdDev([1380, 1380, 1380])).toBe(0);
    });

    it("单元素数组返回 0", () => {
      expect(stdDev([1380])).toBe(0);
    });

    it("空数组等效 → 返回 0 (length < 2)", () => {
      expect(stdDev([])).toBe(0);
    });

    it("[1380, 1440] → σ = 30", () => {
      // mean = 1410, variance = ((1380-1410)^2 + (1440-1410)^2) / 2 = (900+900)/2 = 900, sqrt(900) = 30
      expect(stdDev([1380, 1440])).toBe(30);
    });

    it("规律作息: 23:00±10min → σ<30", () => {
      // 22:50, 22:55, 23:00, 23:05, 23:10 → minutes: 1370, 1375, 1380, 1385, 1390
      const times = [1370, 1375, 1380, 1385, 1390];
      const result = stdDev(times);
      expect(result).toBeLessThan(30);
    });

    it("不规律作息: 大跨度 → σ>60", () => {
      // 22:00, 23:30, 00:30, 01:00, 22:00 → 1320, 1410, 1470, 1500, 1320
      const times = [1320, 1410, 1470, 1500, 1320];
      const result = stdDev(times);
      expect(result).toBeGreaterThan(60);
    });

    it("精确计算验证 [10, 20, 30]", () => {
      // mean = 20, var = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 3 = (100+0+100)/3 = 66.67
      // std = sqrt(66.67) ≈ 8.165
      const result = stdDev([10, 20, 30]);
      expect(result).toBeCloseTo(8.165, 2);
    });
  });
});
