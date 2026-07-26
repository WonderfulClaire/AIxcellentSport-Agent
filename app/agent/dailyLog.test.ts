import { getDailyLog, saveDailyWeight, readDailyWeight, todayKey, dailyToLegacy } from "./dailyLog";

function setLS(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

describe("dailyLog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("todayKey returns YYYY-MM-DD", () => {
    const k = todayKey(new Date(2026, 6, 25));
    expect(k).toBe("2026-07-25");
  });

  it("saveDailyWeight / readDailyWeight round-trip by date", () => {
    saveDailyWeight(62.5, "2026-07-25");
    saveDailyWeight(63, "2026-07-26");
    expect(readDailyWeight("2026-07-25")).toBe(62.5);
    expect(readDailyWeight("2026-07-26")).toBe(63);
    expect(readDailyWeight("2026-07-30")).toBeNull();
  });

  it("aggregates water / meals / sleep / weight from local panels", async () => {
    const t = todayKey();
    setLS("aix_water_v1", { [t]: { cups: 6 } }); // 6 * 250 = 1500 ml
    setLS("aix_quickmeals_v1", {
      [t]: [
        { name: "米饭", calories: 174, protein: 4, carbs: 38, fat: 0.4 },
        { name: "鸡胸", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      ],
    });
    setLS("aix_sleep_v1", [{ date: t, durationHours: 7.5 }]);
    saveDailyWeight(60.2, t);

    const daily = await getDailyLog(7);
    const today = daily.find((e) => e.date === t)!;
    expect(today.waterMl).toBe(1500);
    expect(today.calories).toBe(339);
    expect(today.protein).toBeCloseTo(35.0, 1);
    expect(today.carbs).toBeCloseTo(38.0, 1);
    expect(today.sleepHours).toBe(7.5);
    expect(today.weight).toBe(60.2);
  });

  it("returns arrays of length = days, sorted ascending", async () => {
    const daily = await getDailyLog(14);
    expect(daily.length).toBe(14);
    expect(daily[0].date < daily[13].date).toBe(true);
  });

  it("dailyToLegacy maps to [records, wearable]", async () => {
    const t = todayKey();
    setLS("aix_water_v1", { [t]: { cups: 4 } });
    saveDailyWeight(70, t);
    setLS("aix_sleep_v1", [{ date: t, durationHours: 8 }]);
    const daily = await getDailyLog(7);
    const [records, wearable] = dailyToLegacy(daily);
    const rec = records.find((r) => r.date === t);
    expect(rec.weight).toBe(70);
    expect(rec.sleep_hours).toBe(8);
    expect(Array.isArray(wearable)).toBe(true);
  });
});
