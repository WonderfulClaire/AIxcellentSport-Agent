// app/agent/appleHealthExport.ts
// 解析 iPhone「健康」App 导出的健康数据（export.zip / export.xml），
// 提取「今天」的 Apple Watch 实测数据：步数、活动能量、静息心率、睡眠、训练。
//
// 为什么这是连 iWatch 最稳的方式：
//   苹果禁止任何网页直连 Apple Watch 实时数据（平台限制，无法绕过）。
//   但手表记录会自动进 iPhone「健康」App，而「健康 → 头像 → 导出所有健康数据」
//   会产出一个 export.zip（内含 apple_health_export/export.xml）。在浏览器里
//   直接解析这个文件，就能拿到真实的手表步数/训练/心率/睡眠，无需原生 App、无需上架、免费。
//
// 解析策略：流式逐行扫描（按 \n 切分，不把整文件塞进一个数组），
// 只对今天关心的几条 Record 类型做累加，内存恒定，可处理上百 MB 的导出。

export interface ParsedHealthDay {
  date: string;            // 本地 YYYY-MM-DD
  steps: number | null;
  activeEnergyKcal: number | null;
  restingHr: number | null;
  sleepHours: number | null;
  workouts: { type: string; durationMin: number | null; activeKcal: number | null; avgHr: number | null; maxHr: number | null }[];
  raw: Record<string, number>; // 调试用：各类型命中计数
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 从 Apple 日期字符串（如 "2026-07-23 07:12:00 +0800"）取 Date
function parseAppleDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\s*([+-]\d{4}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se, tz] = m;
  let iso = `${y}-${mo}-${d}T${h}:${mi}:${se}`;
  if (tz) {
    const sign = tz[0];
    const oh = tz.slice(1, 3);
    const om = tz.slice(3, 5);
    iso += `${sign}${oh}:${om}`;
  } else {
    iso += "Z";
  }
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

// 取 Record 标签里某个属性
function attr(line: string, name: string): string | null {
  const m = line.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}
function numAttr(line: string, name: string): number | null {
  const v = attr(line, name);
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const RELEVANT = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKCategoryTypeIdentifierSleepAnalysis",
];

function isRelevant(line: string): boolean {
  if (!line.includes("<Record")) return false;
  return RELEVANT.some((t) => line.includes(`type="${t}"`));
}

// 逐行扫描文本，累加今天的数据
function scan(text: string, todayKey: string, yesterdayKey: string, out: ParsedHealthDay): void {
  let start = 0;
  let idx: number;
  const re = /<Record\b[^>]*\/>/g; // 单行 Record
  // 用 indexOf 切行，避免生成大数组
  while ((idx = text.indexOf("\n", start)) !== -1) {
    const line = text.slice(start, idx);
    start = idx + 1;
    processLine(line);
  }
  if (start < text.length) processLine(text.slice(start));

  function processLine(line: string) {
    // Workout 单独解析（可能跨行，但属性在开标签上）
    if (line.includes("<Workout")) {
      const typeRaw = attr(line, "workoutActivityType") || "训练";
      const type = typeRaw.replace("HKWorkoutActivityType", "");
      const dur = numAttr(line, "duration");
      const en = numAttr(line, "totalEnergyBurned");
      out.workouts.push({
        type,
        durationMin: dur != null ? Math.round(dur) : null,
        activeKcal: en != null ? Math.round(en) : null,
        avgHr: null,
        maxHr: null,
      });
      return;
    }
    if (!isRelevant(line)) return;
    const type = attr(line, "type");
    const sd = attr(line, "startDate");
    if (!type || !sd) return;
    const dt = parseAppleDate(sd);
    if (!dt) return;
    // 关键：直接用导出文件里写明的本地日期（导出地时区），不要再用
    // localDateKey(dt) 在 runner 时区里重新推导——否则 UTC runner 上
    // +0800 的 07:00 会被算成前一天，导致清晨记录漏算。
    const dk = sd.split(/[ T]/)[0];
    const sdHour = parseInt((sd.split(/[ T]/)[1] || "00:00:00").slice(0, 2), 10);
    const val = numAttr(line, "value");
    out.raw[type] = (out.raw[type] || 0) + 1;

    // 只处理今天 / 昨晚的睡眠
    const isToday = dk === todayKey;
    const isLastNightSleep =
      type === "HKCategoryTypeIdentifierSleepAnalysis" &&
      dk === yesterdayKey &&
      sdHour >= 18;

    if (type === "HKQuantityTypeIdentifierStepCount" && isToday && val != null) {
      out.steps = (out.steps || 0) + val;
    } else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned" && isToday && val != null) {
      out.activeEnergyKcal = (out.activeEnergyKcal || 0) + val;
    } else if (type === "HKQuantityTypeIdentifierRestingHeartRate" && isToday && val != null) {
      // 取最后一次（最接近今天）的静息心率
      out.restingHr = out.restingHr == null ? val : out.restingHr;
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis" && (isToday || isLastNightSleep)) {
      const v = attr(line, "value") || "";
      if (v.includes("Asleep")) {
        const ed = attr(line, "endDate");
        const edt = ed ? parseAppleDate(ed) : null;
        if (edt && dt) {
          const hrs = (edt.getTime() - dt.getTime()) / 3_600_000;
          if (hrs > 0 && hrs < 24) out.sleepHours = (out.sleepHours || 0) + hrs;
        }
      }
    }
  }
}

// 解压 zip，定位 export.xml 条目
async function extractExportXml(buf: ArrayBuffer): Promise<Uint8Array | null> {
  const dv = new DataView(buf);
  const sig = 0x04034b50;
  let off = 0;
  let guard = 0;
  while (off + 30 <= dv.byteLength && guard++ < 100000) {
    if (dv.getUint32(off, true) !== sig) {
      // 尝试下一个字节（容错）
      if (off === 0) break;
      off++;
      continue;
    }
    const method = dv.getUint16(off + 8, true);
    const compSize = dv.getUint32(off + 18, true);
    const fnameLen = dv.getUint16(off + 26, true);
    const extraLen = dv.getUint16(off + 28, true);
    const fname = new TextDecoder().decode(new Uint8Array(buf, off + 30, fnameLen));
    const dataStart = off + 30 + fnameLen + extraLen;
    if (fname.endsWith("export.xml") || fname.includes("apple_health_export/export.xml")) {
      const data = new Uint8Array(buf, dataStart, compSize);
      if (method === 0) return data;
      if (method === 8 && typeof (globalThis as any).DecompressionStream !== "undefined") {
        try {
          const ds = new (globalThis as any).DecompressionStream("deflate-raw");
          const stream = new Blob([data]).stream().pipeThrough(ds);
          const ab = await new Response(stream).arrayBuffer();
          return new Uint8Array(ab);
        } catch {
          return null;
        }
      }
      return null;
    }
    off = dataStart + compSize;
    if (compSize === 0 && fnameLen === 0) break;
  }
  return null;
}

export interface ParseOptions {
  // 指定"今天"，默认本地今天
  today?: string;
}

/**
 * 解析 Apple 健康导出文件（.zip 或 .xml）。
 * @returns 今天的 ParsedHealthDay；失败/无数据返回 null。
 */
export async function parseAppleHealthExport(file: File, opts: ParseOptions = {}): Promise<ParsedHealthDay | null> {
  const today = opts.today || localDateKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = localDateKey(y);

  let xmlText: string;
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".xml")) {
    xmlText = await file.text();
  } else if (name.endsWith(".zip")) {
    const buf = await file.arrayBuffer();
    const bytes = await extractExportXml(buf);
    if (!bytes) return null;
    xmlText = new TextDecoder("utf-8").decode(bytes);
  } else {
    // 兜底：当文本尝试
    xmlText = await file.text();
  }

  if (!xmlText.includes("HealthData")) return null;

  const out: ParsedHealthDay = {
    date: today,
    steps: null,
    activeEnergyKcal: null,
    restingHr: null,
    sleepHours: null,
    workouts: [],
    raw: {},
  };
  scan(xmlText, today, yesterday, out);

  const hasData =
    out.steps != null ||
    out.activeEnergyKcal != null ||
    out.restingHr != null ||
    out.sleepHours != null ||
    out.workouts.length > 0;
  return hasData ? out : null;
}

/** 把 ParsedHealthDay 转成 saveWearable 用的载荷 */
export function toWearablePayload(d: ParsedHealthDay): any {
  const payload: any = {
    date: d.date,
    source: "apple_health_export",
    device: "Apple Watch",
  };
  if (d.steps != null) payload.steps = Math.round(d.steps);
  if (d.activeEnergyKcal != null) payload.active_energy = Math.round(d.activeEnergyKcal);
  if (d.restingHr != null) payload.resting_hr = Math.round(d.restingHr);
  if (d.sleepHours != null) payload.sleep_hours = Math.round(d.sleepHours * 10) / 10;
  if (d.workouts.length) {
    const w = d.workouts[0];
    payload.note = d.workouts
      .map((x) => `${x.type}${x.durationMin ? " " + x.durationMin + "min" : ""}`)
      .join(" · ");
    if (w.activeKcal) payload.active_energy = Math.max(payload.active_energy || 0, w.activeKcal);
  }
  return payload;
}
