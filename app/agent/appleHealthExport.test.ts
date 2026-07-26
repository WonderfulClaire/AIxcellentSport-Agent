import { describe, it, expect } from "vitest";
import { parseAppleHealthExport, toWearablePayload } from "./appleHealthExport";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildXml(today: string, yesterday: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="zh_CN">
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="${today} 09:12:00 +0800" endDate="${today} 09:12:00 +0800" value="8520" unit="count"/>
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="${today} 18:30:00 +0800" endDate="${today} 18:30:00 +0800" value="120" unit="count"/>
  <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="${today} 07:00:00 +0800" endDate="${today} 07:45:00 +0800" value="540" unit="kcal"/>
  <Record type="HKQuantityTypeIdentifierRestingHeartRate" startDate="${today} 06:30:00 +0800" endDate="${today} 06:35:00 +0800" value="61" unit="count/min"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="${today} 07:10:00 +0800" endDate="${today} 07:40:00 +0800" value="142" unit="count/min"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="${yesterday} 23:05:00 +0800" endDate="${today} 07:05:00 +0800" value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="32.5" startDate="${today} 07:00:00 +0800" endDate="${today} 07:32:30 +0800" totalEnergyBurned="310" totalEnergyBurnedUnit="kcal" sourceName="Apple Watch"/>
</HealthData>`;
}

describe("appleHealthExport", () => {
  it("解析 export.xml 提取今天的步数/活动能量/静息心率/睡眠/训练", async () => {
    const now = new Date();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const today = ymd(now);
    const yesterday = ymd(y);
    const xml = buildXml(today, yesterday);
    const file = new File([xml], "export.xml", { type: "text/xml" });

    const res = await parseAppleHealthExport(file);
    expect(res).not.toBeNull();
    // 步数 = 8520 + 120
    expect(res!.steps).toBe(8640);
    expect(res!.activeEnergyKcal).toBe(540);
    expect(res!.restingHr).toBe(61);
    // 睡眠约 8 小时（23:05 -> 07:05）
    expect(res!.sleepHours).toBeGreaterThan(7.9);
    expect(res!.sleepHours).toBeLessThan(8.1);
    expect(res!.workouts.length).toBe(1);
    expect(res!.workouts[0].type).toBe("Running");
    expect(res!.workouts[0].durationMin).toBe(33);
    expect(res!.workouts[0].activeKcal).toBe(310);
  });

  it("无关日期的记录不计入今天", async () => {
    const now = new Date();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const today = ymd(now);
    const yesterday = ymd(y);
    const xml = `<HealthData locale="zh_CN">
      <Record type="HKQuantityTypeIdentifierStepCount" startDate="2020-01-01 09:00:00 +0800" value="9999" unit="count"/>
      <Record type="HKQuantityTypeIdentifierStepCount" startDate="${today} 10:00:00 +0800" value="500" unit="count"/>
    </HealthData>`;
    const file = new File([xml], "export.xml", { type: "text/xml" });
    const res = await parseAppleHealthExport(file);
    expect(res).not.toBeNull();
    expect(res!.steps).toBe(500);
  });

  it("无今天数据返回 null", async () => {
    const xml = `<HealthData locale="zh_CN">
      <Record type="HKQuantityTypeIdentifierStepCount" startDate="2019-05-05 09:00:00 +0800" value="100" unit="count"/>
    </HealthData>`;
    const file = new File([xml], "export.xml", { type: "text/xml" });
    const res = await parseAppleHealthExport(file);
    expect(res).toBeNull();
  });

  it("toWearablePayload 生成可存档案的载荷（含来源标记）", async () => {
    const now = new Date();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const today = ymd(now);
    const yesterday = ymd(y);
    const file = new File([buildXml(today, yesterday)], "export.xml", { type: "text/xml" });
    const res = await parseAppleHealthExport(file);
    const payload = toWearablePayload(res!);
    expect(payload.source).toBe("apple_health_export");
    expect(payload.device).toBe("Apple Watch");
    expect(payload.steps).toBe(8640);
    expect(payload.note).toContain("Running");
  });
});
