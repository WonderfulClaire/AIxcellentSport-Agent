import { describe, it, expect } from "vitest";
import { FOOD_DB, getFood, searchFood, nutritionForGrams } from "./foodDB";

describe("foodDB", () => {
  it("数据库非空且字段完整", () => {
    expect(FOOD_DB.length).toBeGreaterThan(20);
    for (const f of FOOD_DB) {
      expect(f.name).toBeTruthy();
      expect(f.kcal100).toBeGreaterThan(0);
      expect(Array.isArray(f.portions) && f.portions.length > 0).toBe(true);
    }
  });

  it("按别名精确查找（鸡胸肉）", () => {
    const f = getFood("鸡胸肉");
    expect(f).not.toBeNull();
    expect(f!.kcal100).toBe(165);
    expect(f!.protein100).toBeGreaterThan(25);
  });

  it("模糊搜索（米饭）返回中文名结果", () => {
    const r = searchFood("米饭");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].name).toContain("米饭");
  });

  it("空查询返回前若干个", () => {
    const r = searchFood("");
    expect(r.length).toBeGreaterThan(0);
  });

  it("nutritionForGrams 按比例换算（鸡胸肉 100g = 165 kcal）", () => {
    const f = getFood("鸡胸肉")!;
    const n = nutritionForGrams(f, 100);
    expect(n.kcal).toBe(165);
    expect(n.protein).toBeCloseTo(31, 0);
  });

  it("nutritionForGrams 半份按比例减半", () => {
    const f = getFood("米饭(熟)")!;
    const full = nutritionForGrams(f, 150);
    const half = nutritionForGrams(f, 75);
    expect(half.kcal).toBeCloseTo(full.kcal / 2, 0);
  });
});
