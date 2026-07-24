// app/agent/energyScoreEngine.ts
// 能量评分算法引擎 (U5): 0-100 加权模型
// 全部纯本地计算，无需外部 API

/**
 * 能量评分维度
 */
export type EnergyDimension = {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number;
  available: boolean;
  detail: string;
};

export type EnergyScoreResult = {
  totalScore: number;
  level: string;
  levelDescription: string;
  dimensions: EnergyDimension[];
  interpretations: string[];
};

/**
 * 睡眠评分 (0-100)
 * - 时长：7-9h=100, 6-7h=75, 5-6h=50, <5h=25, >9h=80
 * - 规律性加分：σ<30min +10, σ>60min -10
 */
export function calcSleepScore(sleepRecords: any[]): { score: number; detail: string } | null {
  if (!sleepRecords || sleepRecords.length === 0) return null;

  // Get recent sleep data (last 7 days)
  const now = Date.now();
  const recent = sleepRecords
    .filter((r: any) => {
      if (!r.date) return false;
      const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    })
    .slice(0, 7);

  if (recent.length === 0) return null;

  // Average duration
  const durations = recent
    .map((r: any) => r.durationHours || r.sleep_hours || 0)
    .filter((d: number) => d > 0);

  if (durations.length === 0) return null;

  const avgDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;

  // Duration score
  let durationScore: number;
  if (avgDuration >= 7 && avgDuration <= 9) durationScore = 100;
  else if (avgDuration > 9) durationScore = 80;
  else if (avgDuration >= 6) durationScore = 75;
  else if (avgDuration >= 5) durationScore = 50;
  else durationScore = 25;

  // Regularity bonus (if bedTime data available)
  let regularityBonus = 0;
  const bedTimes = recent
    .map((r: any) => r.bedTime)
    .filter((t: any) => t && typeof t === "string");

  if (bedTimes.length >= 3) {
    const bedMins = bedTimes.map((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const mins = h * 60 + m;
      return h < 6 ? mins + 24 * 60 : mins;
    });
    const mean = bedMins.reduce((a: number, b: number) => a + b, 0) / bedMins.length;
    const variance = bedMins.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / bedMins.length;
    const std = Math.sqrt(variance);
    if (std < 30) regularityBonus = 10;
    else if (std > 60) regularityBonus = -10;
  }

  const score = Math.max(0, Math.min(100, durationScore + regularityBonus));
  const detail = `均睡${avgDuration.toFixed(1)}h${regularityBonus !== 0 ? (regularityBonus > 0 ? " 规律+10" : " 不规律-10") : ""}`;

  return { score, detail };
}

/**
 * 心率评分 (0-100)
 * - 静息心率 50-70 = 高分(80-100)
 * - 趋势：比上周下降=+10，上升=-10
 */
export function calcHeartRateScore(wearableData: any[]): { score: number; detail: string } | null {
  if (!wearableData || wearableData.length === 0) return null;

  const now = Date.now();
  const recent = wearableData
    .filter((r: any) => {
      if (!r.date) return false;
      const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 14;
    })
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  // Get heart rate values
  const last7 = recent.filter((r: any) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const prev7 = recent.filter((r: any) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo > 7 && daysAgo <= 14;
  });

  const hrValues = last7
    .map((r: any) => r.resting_hr || r.avg_hr)
    .filter((v: any) => typeof v === "number" && v > 0);

  if (hrValues.length === 0) return null;

  const avgHR = hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length;

  // Base score based on resting HR range
  let baseScore: number;
  if (avgHR >= 50 && avgHR <= 60) baseScore = 100;
  else if (avgHR > 60 && avgHR <= 70) baseScore = 85;
  else if (avgHR > 70 && avgHR <= 80) baseScore = 65;
  else if (avgHR > 80 && avgHR <= 90) baseScore = 45;
  else if (avgHR > 90) baseScore = 30;
  else baseScore = 70; // below 50, unusual

  // Trend bonus
  let trendBonus = 0;
  const prevHRs = prev7
    .map((r: any) => r.resting_hr || r.avg_hr)
    .filter((v: any) => typeof v === "number" && v > 0);

  if (prevHRs.length > 0) {
    const prevAvg = prevHRs.reduce((a: number, b: number) => a + b, 0) / prevHRs.length;
    if (avgHR < prevAvg - 2) trendBonus = 10;
    else if (avgHR > prevAvg + 2) trendBonus = -10;
  }

  const score = Math.max(0, Math.min(100, baseScore + trendBonus));
  const detail = `静息${Math.round(avgHR)}bpm${trendBonus !== 0 ? (trendBonus > 0 ? " 趋降+10" : " 趋升-10") : ""}`;

  return { score, detail };
}

/**
 * HRV 评分 (0-100)
 * - 归一化：(当前HRV / 个人30天平均HRV) × 80，cap 在 0-100
 */
export function calcHRVScore(wearableData: any[]): { score: number; detail: string } | null {
  if (!wearableData || wearableData.length === 0) return null;

  const now = Date.now();
  const withHRV = wearableData
    .filter((r: any) => r.date && typeof r.hrv === "number" && r.hrv > 0)
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  if (withHRV.length === 0) return null;

  // Last 7 days HRV
  const recent7 = withHRV.filter((r: any) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  if (recent7.length === 0) return null;

  const currentAvgHRV = recent7.reduce((s: number, r: any) => s + r.hrv, 0) / recent7.length;

  // 30-day baseline
  const baseline30 = withHRV.filter((r: any) => {
    const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  });

  let baselineAvg: number;
  if (baseline30.length >= 7) {
    baselineAvg = baseline30.reduce((s: number, r: any) => s + r.hrv, 0) / baseline30.length;
  } else {
    // Not enough baseline, use absolute ranges
    // Typical adult HRV: 20-80ms
    baselineAvg = 50;
  }

  const score = Math.max(0, Math.min(100, Math.round((currentAvgHRV / baselineAvg) * 80)));
  const detail = `HRV ${Math.round(currentAvgHRV)}ms (基线${Math.round(baselineAvg)}ms)`;

  return { score, detail };
}

/**
 * 活动评分 (0-100)
 * - 日均步数/8000 × 100, cap at 100
 */
export function calcActivityScore(wearableData: any[]): { score: number; detail: string } | null {
  if (!wearableData || wearableData.length === 0) return null;

  const now = Date.now();
  const recent = wearableData
    .filter((r: any) => {
      if (!r.date) return false;
      const daysAgo = (now - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    })
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  const stepsValues = recent
    .map((r: any) => r.steps)
    .filter((v: any) => typeof v === "number" && v > 0);

  if (stepsValues.length === 0) return null;

  const avgSteps = stepsValues.reduce((a: number, b: number) => a + b, 0) / stepsValues.length;
  const score = Math.max(0, Math.min(100, Math.round((avgSteps / 8000) * 100)));
  const detail = `日均${Math.round(avgSteps)}步`;

  return { score, detail };
}

/**
 * 综合能量评分（加权模型）
 * 权重: 睡眠0.35, 心率0.25, HRV0.25, 活动0.15
 * 缺失维度自动权重重分配
 */
export function calcEnergyScore(
  sleepRecords: any[],
  wearableData: any[]
): EnergyScoreResult | null {
  const DEFAULT_WEIGHTS = { sleep: 0.35, hr: 0.25, hrv: 0.25, activity: 0.15 };

  const sleepResult = calcSleepScore(sleepRecords);
  const hrResult = calcHeartRateScore(wearableData);
  const hrvResult = calcHRVScore(wearableData);
  const actResult = calcActivityScore(wearableData);

  const dimensions: EnergyDimension[] = [
    { key: "sleep", label: "睡眠", score: sleepResult?.score ?? 0, weight: DEFAULT_WEIGHTS.sleep, available: !!sleepResult, detail: sleepResult?.detail ?? "无数据" },
    { key: "hr", label: "心率", score: hrResult?.score ?? 0, weight: DEFAULT_WEIGHTS.hr, available: !!hrResult, detail: hrResult?.detail ?? "无数据" },
    { key: "hrv", label: "HRV", score: hrvResult?.score ?? 0, weight: DEFAULT_WEIGHTS.hrv, available: !!hrvResult, detail: hrvResult?.detail ?? "无数据" },
    { key: "activity", label: "活动", score: actResult?.score ?? 0, weight: DEFAULT_WEIGHTS.activity, available: !!actResult, detail: actResult?.detail ?? "无数据" },
  ];

  const availableDims = dimensions.filter((d) => d.available);
  if (availableDims.length === 0) return null;

  // Redistribute weights to available dimensions
  const totalAvailWeight = availableDims.reduce((s, d) => s + d.weight, 0);
  const totalScore = Math.round(
    availableDims.reduce((s, d) => s + d.score * (d.weight / totalAvailWeight), 0)
  );

  // Determine level
  let level: string;
  let levelDescription: string;
  if (totalScore >= 90) { level = "极佳"; levelDescription = "状态极佳，适合高强度训练"; }
  else if (totalScore >= 70) { level = "良好"; levelDescription = "状态良好，正常训练"; }
  else if (totalScore >= 50) { level = "一般"; levelDescription = "有些疲劳，建议轻度活动或休息"; }
  else if (totalScore >= 30) { level = "疲劳"; levelDescription = "较为疲劳，建议以恢复为主"; }
  else { level = "低迷"; levelDescription = "需要充分休息，避免剧烈运动"; }

  // Build interpretations
  const interpretations: string[] = [];
  interpretations.push(`综合能量评分 ${totalScore} 分，状态${level}`);
  interpretations.push(levelDescription);

  if (sleepResult) {
    if (sleepResult.score >= 80) interpretations.push("睡眠充足，恢复良好");
    else if (sleepResult.score < 50) interpretations.push("睡眠不足，影响恢复，建议早睡");
  }
  if (hrResult) {
    if (hrResult.score >= 80) interpretations.push("静息心率处于良好区间");
    else if (hrResult.score < 50) interpretations.push("心率偏高，可能存在疲劳或压力");
  }

  return { totalScore, level, levelDescription, dimensions, interpretations };
}
