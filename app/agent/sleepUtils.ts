// app/agent/sleepUtils.ts
// 睡眠分析工具函数 —— 从 SleepTracker 提取，供组件和测试共用

/** Convert HH:mm bedTime to minutes since midnight (handling cross-day: <6:00 treated as next day) */
export function bedTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  if (h < 6) return mins + 24 * 60; // e.g., 01:30 → 1530 min
  return mins;
}

/** Calculate standard deviation of an array of numbers (population σ) */
export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** Get day of week (1=Mon...7=Sun) from YYYY-MM-DD */
export function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}
