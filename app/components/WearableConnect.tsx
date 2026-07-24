"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProfile, getWearable, saveWearable } from "../healthStore";
import ModuleIntro from "./ModuleIntro";

/* 可穿戴设备接入
 * ① 网页蓝牙(Web Bluetooth)直连标准心率服务(0x180D) → 浏览器内实时 BPM，无需装 App。
 *    支持：Android Chrome / 桌面 Chrome、Edge（需 HTTPS）。iOS Safari / Firefox 不支持。
 * ② Apple Watch / iPhone：苹果不允许任何网页直连其实时数据（平台限制，无法绕过）。
 *    但 Apple Watch 数据会自动同步到 iPhone「健康」App，可借 iOS「快捷指令」取出后导入/同步本产品
 *    （见下方「🍎 连接 Apple Watch」面板）。这正好实现"用户在的时候连一下 / 运动完分析 / 靠近时再同步"，
 *    且免费、无需原生 App、无需上架。
 * ③ 手动录入 & 导入(JSON/CSV / Apple 健康 JSON) 作为兜底。
 */

type Status = "idle" | "connecting" | "connected" | "error";
type Sample = { t: number; bpm: number };
type ZoneDist = { name: string; min: number; max: number; color: string; percent: number };
type SessionSummary = { durationSec: number; avg: number; peak: number; distribution: ZoneDist[] };

const HR_ZONE_COLORS = ['#F4E4B0', '#F4D27A', '#D4AF37', '#B8860B', '#8B6914'];
const HR_ZONE_NAMES = ['热身', '燃脂', '有氧', '无氧', '极限'];
const HR_ZONE_THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

function computeSessionSummary(hrSamples: number[], mhr: number, durationSec: number): SessionSummary {
  const avg = hrSamples.length ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : 0;
  const peak = hrSamples.length ? Math.max(...hrSamples) : 0;
  const zones: ZoneDist[] = HR_ZONE_NAMES.map((name, i) => {
    const min = mhr * HR_ZONE_THRESHOLDS[i];
    const max = mhr * HR_ZONE_THRESHOLDS[i + 1];
    const count = hrSamples.filter(hr => hr >= min && (i === 4 ? hr <= max : hr < max)).length;
    return { name, min, max, color: HR_ZONE_COLORS[i], percent: hrSamples.length ? Math.round(count / hrSamples.length * 1000) / 10 : 0 };
  });
  return { durationSec, avg, peak, distribution: zones };
}

function calcAge(birthday: string): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age > 0 && age < 120 ? age : null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const num = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
const SHORTCUT_NAME = "同步健康到私享管家";

function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16 = flags & 0x01;
  return is16 ? value.getUint16(1, true) : value.getUint8(1);
}

function normalizeAppleHealth(j: any): any[] {
  const byDate = new Map<string, any>();
  const get = (date: string) => {
    if (!byDate.has(date)) {
      byDate.set(date, {
        date, source: "apple_health", device: "Apple Watch",
        resting_hr: null, avg_hr: null, max_hr: null,
        steps: null, sleep_hours: null, spo2: null, hrv: null,
        active_energy: null, note: null,
      });
    }
    return byDate.get(date)!;
  };
  const maxOf = (a: any, b: any) => (a == null ? b : b == null ? a : Math.max(a, b));

  (j.records || []).forEach((r: any) => {
    if (!r || !r.date) return;
    const e = get(r.date);
    e.resting_hr = num(r.resting_hr) ?? e.resting_hr;
    e.avg_hr = num(r.avg_hr) ?? e.avg_hr;
    e.max_hr = num(r.max_hr) ?? e.max_hr;
    e.steps = num(r.steps) ?? e.steps;
    e.sleep_hours = num(r.sleep_hours) ?? e.sleep_hours;
    e.spo2 = num(r.spo2) ?? e.spo2;
    e.hrv = num(r.hrv) ?? e.hrv;
    e.active_energy = maxOf(e.active_energy, num(r.active_energy ?? r.active_energy_kcal));
    e.note = r.note || e.note;
  });

  (j.workouts || []).forEach((w: any) => {
    if (!w || !w.date) return;
    const e = get(w.date);
    let avg = num(w.avg_hr);
    let max = num(w.max_hr);
    if (Array.isArray(w.hr_samples) && w.hr_samples.length) {
      const vals = w.hr_samples.filter((x: any) => typeof x === "number" && x > 0);
      if (vals.length) {
        avg = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
        max = Math.max(...vals);
      }
    }
    e.avg_hr = e.avg_hr ?? avg;
    e.max_hr = e.max_hr ?? max;
    e.active_energy = maxOf(e.active_energy, num(w.active_energy ?? w.active_energy_kcal));
    const wnote = `${w.type || "训练"} ${w.duration_min ? w.duration_min + "min" : ""}`.trim();
    e.note = e.note ? `${e.note} · ${wnote}` : wnote;
  });

  return [...byDate.values()];
}

export default function WearableConnect() {
  const supported =
    typeof navigator !== "undefined" && !!(navigator as any).bluetooth;

  const [status, setStatus] = useState<Status>("idle");
  const [deviceName, setDeviceName] = useState<string>("");
  const [bpm, setBpm] = useState<number>(0);
  const [battery, setBattery] = useState<number | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [err, setErr] = useState<string>("");
  const [saved, setSaved] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [showAppleSteps, setShowAppleSteps] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [showAgeConfig, setShowAgeConfig] = useState(false);
  const [ageInput, setAgeInput] = useState("");

  const deviceRef = useRef<any>(null);
  const startedRef = useRef<number>(0);
  const allSamplesRef = useRef<number[]>([]);

  const loadHistory = useCallback(async () => {
    setHistory(await getWearable());
  }, []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        if (!p) return;
        if (p.age && Number(p.age) > 0) { setUserAge(Number(p.age)); return; }
        if (p.birthday) { const a = calcAge(p.birthday); if (a) setUserAge(a); }
      } catch { /* ignore */ }
    })();
  }, []);

  const mhr = userAge ? 220 - userAge : 190;

  const onHR = useCallback((e: any) => {
    const v: DataView = e.target.value;
    const b = parseHeartRate(v);
    if (!b || b < 25 || b > 240) return;
    setBpm(b);
    allSamplesRef.current.push(b);
    setSamples((prev) => {
      const next = [...prev, { t: Date.now(), bpm: b }];
      return next.length > 90 ? next.slice(next.length - 90) : next;
    });
  }, []);

  const connect = useCallback(async () => {
    setErr("");
    setSaved("");
    if (!supported) {
      setErr("当前浏览器不支持网页蓝牙。请用安卓 Chrome 或电脑 Chrome/Edge；iPhone 用户请用下方「手动录入 / 导入」，或看上方「🍎 连接 Apple Watch」用快捷指令同步。");
      return;
    }
    try {
      setStatus("connecting");
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });
      deviceRef.current = device;
      setDeviceName(device.name || "心率设备");
      device.addEventListener("gattserverdisconnected", () => {
        setStatus("idle");
        setBpm(0);
      });
      const server = await device.gatt.connect();
      const hr = await server.getPrimaryService("heart_rate");
      const ch = await hr.getCharacteristic("heart_rate_measurement");
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", onHR);
      startedRef.current = Date.now();
      setSamples([]);
      allSamplesRef.current = [];
      setShowSummary(false);
      setSessionSummary(null);
      setStatus("connected");
      try {
        const bs = await server.getPrimaryService("battery_service");
        const bc = await bs.getCharacteristic("battery_level");
        const bv = await bc.readValue();
        setBattery(bv.getUint8(0));
      } catch {
        setBattery(null);
      }
    } catch (e: any) {
      if (e && e.name === "NotFoundError") {
        setStatus("idle");
      } else {
        setStatus("error");
        setErr("连接失败：" + (e?.message || "请确认设备已开启蓝牙并支持标准心率广播"));
      }
    }
  }, [supported, onHR]);

  const disconnect = useCallback(() => {
    try {
      deviceRef.current?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
    if (allSamplesRef.current.length > 0 && startedRef.current) {
      const dur = Math.round((Date.now() - startedRef.current) / 1000);
      const summary = computeSessionSummary(allSamplesRef.current, mhr, dur);
      setSessionSummary(summary);
      setShowSummary(true);
    }
    setStatus("idle");
    setBpm(0);
  }, [mhr]);

  const bpms = samples.map((s) => s.bpm);
  const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;
  const maxHr = bpms.length ? Math.max(...bpms) : 0;
  const minHr = bpms.length ? Math.min(...bpms) : 0;
  const durationSec = startedRef.current ? Math.round((Date.now() - startedRef.current) / 1000) : 0;

  const saveLive = useCallback(async () => {
    if (!bpms.length) return;
    await saveWearable({
      date: todayStr(),
      source: "ble",
      device: deviceName,
      resting_hr: minHr,
      avg_hr: avgHr,
      max_hr: maxHr,
      samples: bpms.length,
    });
    setSaved("已保存本次实时心率到今日档案 ✓");
    loadHistory();
  }, [bpms.length, deviceName, minHr, avgHr, maxHr, loadHistory]);

  const [m, setM] = useState<any>({ date: todayStr(), steps: "", sleep_hours: "", spo2: "", hrv: "", resting_hr: "" });
  const saveManual = useCallback(async () => {
    const payload: any = { date: m.date || todayStr(), source: "manual" };
    ["steps", "sleep_hours", "spo2", "hrv", "resting_hr"].forEach((k) => {
      if (m[k] !== "" && m[k] != null) payload[k] = Number(m[k]);
    });
    await saveWearable(payload);
    setSaved("已保存手动录入 ✓");
    setM({ date: todayStr(), steps: "", sleep_hours: "", spo2: "", hrv: "", resting_hr: "" });
    loadHistory();
  }, [m, loadHistory]);

  const fileRef = useRef<HTMLInputElement>(null);
  const onImport = useCallback(
    async (file: File) => {
      setErr("");
      setSaved("");
      try {
        const text = await file.text();
        let rows: any[] = [];
        if (file.name.toLowerCase().endsWith(".json")) {
          const j = JSON.parse(text);
          if (j && (j.schema === "aix-apple-health/v1" || Array.isArray(j.records) || Array.isArray(j.workouts))) {
            rows = normalizeAppleHealth(j);
          } else {
            rows = Array.isArray(j) ? j : j.wearable || j.records || [];
          }
        } else {
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          const header = lines[0].split(",").map((h) => h.trim());
          rows = lines.slice(1).map((l) => {
            const cells = l.split(",");
            const o: any = {};
            header.forEach((h, i) => (o[h] = cells[i]?.trim()));
            return o;
          });
        }
        let n = 0;
        for (const r of rows) {
          if (!r || (!r.date && !r.Date)) continue;
          if (r.source === "apple_health") {
            await saveWearable(r);
          } else {
            const payload: any = { date: r.date || r.Date, source: "import" };
            ["steps", "sleep_hours", "spo2", "hrv", "resting_hr", "avg_hr", "max_hr", "active_energy", "active_energy_kcal", "device", "note"].forEach((k) => {
              const v = r[k] ?? r[k[0].toUpperCase() + k.slice(1)];
              if (v !== undefined && v !== "" && v != null) payload[k] = Number(v);
            });
            await saveWearable(payload);
          }
          n++;
        }
        setSaved(`已导入 ${n} 条数据 ✓（Apple Watch 数据标记为 🍎）`);
        loadHistory();
      } catch (e: any) {
        setErr("导入失败：文件需为 JSON 数组、含表头的 CSV，或本产品「Apple 健康」快捷指令导出的 JSON。");
      }
    },
    [loadHistory]
  );

  const runShortcut = () => {
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
    window.location.href = url;
  };

  const beatDur = bpm ? Math.max(0.35, 60 / bpm) : 1;

  const srcLabel = (s: string) =>
    s === "ble" ? "实时" : s === "import" ? "导入" : s === "apple_health" ? "🍎 Apple" : "手动";

  const closeSummary = () => { setShowSummary(false); setSessionSummary(null); };

  const applyAge = () => {
    const v = parseInt(ageInput, 10);
    if (v > 0 && v < 120) { setUserAge(v); setShowAgeConfig(false); }
  };

  const fmtDuration = (sec: number) => {
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <section className="wearable-wrap">
      <ModuleIntro
        title="可穿戴设备"
        what="连接蓝牙心率带或导入 Apple Watch 数据"
        how={["点击扫描连接蓝牙心率设备","或通过 iOS 快捷指令导入 Apple 健康数据","查看实时心率和会话小结"]}
        tip="支持标准心率 BLE 协议设备"
      />
      <div className="section-heading">
        <div>
          <span className="eyebrow">WEARABLE SYNC</span>
          <h2>可穿戴设备 · 实时数据</h2>
        </div>
        <p>连接你的蓝牙心率设备，浏览器内实时读取心率；数据自动进入你的健康档案。</p>
      </div>

      {/* 心率区间年龄配置 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => setShowAgeConfig(v => !v)}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,55,.4)', color: '#D4AF37', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          ⚙ 心率区间设置 (MHR={mhr})
        </button>
        {showAgeConfig && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              placeholder="输入年龄"
              value={ageInput}
              onChange={e => setAgeInput(e.target.value)}
              style={{ width: 72, background: 'rgba(24,22,18,.9)', border: '1px solid rgba(212,175,55,.3)', color: '#ECE7D8', borderRadius: 4, padding: '3px 6px', fontSize: 12 }}
            />
            <button onClick={applyAge} style={{ background: '#D4AF37', color: '#0B0B0D', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>确定</button>
            <span style={{ color: '#888', fontSize: 11 }}>{userAge ? `当前年龄 ${userAge}` : '未设置，默认 MHR=190'}</span>
          </span>
        )}
      </div>

      {/* 实时心率主卡 */}
      <div className="wear-live-card">
        <div className="wear-heart" style={{ animationDuration: `${beatDur}s` }} aria-hidden>
          <svg viewBox="0 0 32 29" width="72" height="66">
            <path
              d="M16 29S1 19.5 1 9.5A8.5 8.5 0 0116 5a8.5 8.5 0 0115 4.5C31 19.5 16 29 16 29z"
              fill="url(#hg)"
            />
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F4D27A" />
                <stop offset="1" stopColor="#D4AF37" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="wear-live-readout">
          <div className="wear-bpm">
            <strong>{bpm || "--"}</strong>
            <small>BPM</small>
          </div>
          <div className="wear-status-line">
            <span className={`wear-dot ${status}`} />
            {status === "connected" && <span>已连接 · {deviceName}{battery != null ? ` · 电量 ${battery}%` : ""}</span>}
            {status === "connecting" && <span>正在连接…</span>}
            {status === "idle" && <span>未连接</span>}
            {status === "error" && <span>连接异常</span>}
          </div>
          {status === "connected" && (
            <div className="wear-session">
              <span>均 <b>{avgHr}</b></span>
              <span>峰 <b>{maxHr}</b></span>
              <span>谷 <b>{minHr}</b></span>
              <span>时长 <b>{durationSec}s</b></span>
            </div>
          )}
        </div>
        <div className="wear-actions">
          {status !== "connected" ? (
            <button className="wear-btn primary" onClick={connect} disabled={status === "connecting"}>
              {status === "connecting" ? "连接中…" : "连接设备"}
            </button>
          ) : (
            <>
              <button className="wear-btn" onClick={saveLive} disabled={!bpms.length}>保存今日读数</button>
              <button className="wear-btn ghost" onClick={disconnect}>断开</button>
            </>
          )}
        </div>
      </div>

      {/* 会话小结卡片 */}
      {showSummary && sessionSummary && (
        <div style={{
          background: 'rgba(24,22,18,.92)',
          border: '1px solid rgba(212,175,55,.3)',
          borderRadius: 12,
          padding: '20px 24px',
          marginTop: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#D4AF37', margin: 0, fontSize: 16 }}>本次会话小结</h3>
            <button onClick={closeSummary} style={{ background: 'transparent', border: '1px solid rgba(212,175,55,.3)', color: '#D4AF37', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>关闭小结</button>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ECE7D8', fontSize: 28, fontWeight: 700 }}>{fmtDuration(sessionSummary.durationSec)}</div>
              <div style={{ color: '#888', fontSize: 12 }}>时长</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ECE7D8', fontSize: 28, fontWeight: 700 }}>{sessionSummary.avg}</div>
              <div style={{ color: '#888', fontSize: 12 }}>平均心率 bpm</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ECE7D8', fontSize: 28, fontWeight: 700 }}>{sessionSummary.peak}</div>
              <div style={{ color: '#888', fontSize: 12 }}>峰值心率 bpm</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>心率区间分布 (MHR={mhr})</div>
            <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden' }}>
              {sessionSummary.distribution.map((z, i) => (
                z.percent > 0 ? (
                  <div key={i} style={{ width: `${z.percent}%`, background: z.color, minWidth: z.percent > 0 ? 2 : 0 }} title={`${z.name} ${z.percent}%`} />
                ) : null
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {sessionSummary.distribution.map((z, i) => (
                <span key={i} style={{ fontSize: 11, color: '#ECE7D8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: z.color }} />
                  {z.name} {z.percent}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 实时折线 */}
      {samples.length > 1 && (
        <div className="wear-chart-card">
          <span className="wear-chart-title">实时心率曲线（最近 {samples.length} 次采样）</span>
          <svg className="wear-chart" viewBox="0 0 320 80" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2"
              points={samples
                .map((s, i) => {
                  const x = (i * 320) / Math.max(1, samples.length - 1);
                  const lo = Math.max(40, minHr - 8);
                  const hi = Math.min(220, maxHr + 8);
                  const y = 76 - ((s.bpm - lo) / Math.max(1, hi - lo)) * 68;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      )}

      {err && <p className="wear-err">{err}</p>}
      {saved && <p className="wear-ok">{saved}</p>}

      {!supported && (
        <div className="wear-notice">
          <b>此浏览器不支持网页蓝牙</b>
          <span>iPhone / Safari / Firefox 无法直连蓝牙设备。你可以用下面的「手动录入」或「导入」，更推荐看上方「🍎 连接 Apple Watch」用 iOS 快捷指令把健康数据一键同步进来。</span>
        </div>
      )}

      {/* 🍎 Apple Watch / 健康 App 同步面板 */}
      <div className="wear-apple">
        <div className="wear-apple-head">
          <span className="wear-apple-ico">🍎</span>
          <div>
            <h3>连接 Apple Watch / 健康 App</h3>
            <p>苹果不允许网页直连 Apple Watch 实时数据（平台限制）。但你的手表数据会自动进 iPhone「健康」App，用 iOS「快捷指令」即可取出并同步到本产品——免费、无需装 App、无需上架。</p>
          </div>
        </div>

        <div className="wear-apple-actions">
          <button className="wear-btn primary" onClick={runShortcut}>在 iPhone 上运行同步</button>
          <button className="wear-btn ghost" onClick={() => setShowAppleSteps((v) => !v)}>
            {showAppleSteps ? "收起设置步骤" : "查看设置步骤"}
          </button>
        </div>

        {showAppleSteps && (
          <div className="wear-steps">
            <ol>
              <li>打开 iPhone「快捷指令」App → 右上「＋」新建 → 命名「<b>{SHORTCUT_NAME}</b>」。</li>
              <li>加「健康」动作 →「获取 [心率] 样本，时间：今天」→ 接「计算统计」得 <b>平均 / 最小(≈静息) / 最大</b>。</li>
              <li>再加「健康」→「获取 [步数] 样本，今天」→「计算统计·总和」= 步数；同理取 睡眠分析(昨晚时长)、血氧(平均)、HRV(平均)、活动能量(总和)。</li>
              <li>加「词典」组装成下方 JSON（<code>date</code> 用「今天的日期」变量）。</li>
              <li>
                两种收尾：
                <br />· <b>文件模式（现在就能用）</b>：加「存储文件」→ 存到「我的 iPhone / 私享管家 / health.json」。再回本网页 → 可穿戴设备 → 导入 → 选该文件。
                <br />· <b>直传模式（后端部署后）</b>：加「获取 URL 内容」→ POST 到 <code>https://你的后端/api/health/sync</code> → 请求体=上面的 JSON → 头部 <code>Authorization: Bearer &lt;登录 token&gt;</code>。
              </li>
              <li><b>想要自动同步</b>：快捷指令底部「自动化」→「新建个人自动化」→ 触发选「每天 21:00」/「到达[家]」/「打开本网页」→ 运行本快捷指令（关掉「运行前询问」即全自动）。</li>
            </ol>
            <div className="wear-schema">
              <span>快捷指令输出的 JSON（我们的导入格式）：</span>
              <pre>{`{
  "schema": "aix-apple-health/v1",
  "records": [
    { "date": "2026-07-23", "resting_hr": 61, "avg_hr": 74,
      "max_hr": 165, "steps": 8200, "sleep_hours": 7.4,
      "spo2": 98, "hrv": 45, "active_energy_kcal": 540 }
  ],
  "workouts": [
    { "date": "2026-07-23", "type": "跑步", "duration_min": 32,
      "avg_hr": 142, "max_hr": 165, "active_energy_kcal": 310,
      "hr_samples": [120,128,135,140,138,145,150,160,165,158] }
  ]
}`}</pre>
              <p className="wear-hint">导入时会按日期合并；<code>workouts</code> 的 <code>hr_samples</code> 会自动算出平均 / 峰值心率。</p>
            </div>
          </div>
        )}
      </div>

      <div className="wear-grid">
        {/* 手动录入 */}
        <div className="wear-panel">
          <h3>手动录入</h3>
          <p className="wear-hint">Apple Watch / 华为 / 小米用户，把当天数据填进来即可。</p>
          <div className="wear-form">
            <label>日期<input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} /></label>
            <label>步数<input type="number" placeholder="如 8000" value={m.steps} onChange={(e) => setM({ ...m, steps: e.target.value })} /></label>
            <label>睡眠(小时)<input type="number" step="0.1" placeholder="如 7.5" value={m.sleep_hours} onChange={(e) => setM({ ...m, sleep_hours: e.target.value })} /></label>
            <label>血氧(%)<input type="number" placeholder="如 98" value={m.spo2} onChange={(e) => setM({ ...m, spo2: e.target.value })} /></label>
            <label>HRV(ms)<input type="number" placeholder="如 45" value={m.hrv} onChange={(e) => setM({ ...m, hrv: e.target.value })} /></label>
            <label>静息心率<input type="number" placeholder="如 62" value={m.resting_hr} onChange={(e) => setM({ ...m, resting_hr: e.target.value })} /></label>
          </div>
          <button className="wear-btn primary full" onClick={saveManual}>保存录入</button>
        </div>

        {/* 导入 */}
        <div className="wear-panel">
          <h3>导入数据</h3>
          <p className="wear-hint">支持 JSON 数组、带表头 CSV，或本产品「Apple 健康」快捷指令导出的 JSON（含 records / workouts）。</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ""; }}
          />
          <button className="wear-btn full" onClick={() => fileRef.current?.click()}>选择文件导入</button>
          <div className="wear-sample">
            示例 CSV：<code>date,steps,sleep_hours,resting_hr<br />2026-07-23,8200,7.4,61</code>
          </div>
        </div>
      </div>

      {/* 历史 */}
      <div className="wear-history">
        <h3>已记录的可穿戴数据（{history.length}）</h3>
        {history.length === 0 ? (
          <p className="wear-hint">还没有数据。连接设备保存、手动录入、或用「🍎 连接 Apple Watch」同步后会显示在这里。</p>
        ) : (
          <div className="wear-history-list">
            {history.slice(0, 14).map((h, i) => (
              <div className="wear-history-item" key={i}>
                <span className="wh-date">{h.date}</span>
                <span className={`wh-src ${h.source}`}>{srcLabel(h.source)}</span>
                <div className="wh-metrics">
                  {h.resting_hr != null && <em>静息 {h.resting_hr}</em>}
                  {h.avg_hr != null && <em>均心 {h.avg_hr}</em>}
                  {h.max_hr != null && <em>峰值 {h.max_hr}</em>}
                  {h.steps != null && <em>{h.steps} 步</em>}
                  {h.sleep_hours != null && <em>睡 {h.sleep_hours}h</em>}
                  {h.spo2 != null && <em>血氧 {h.spo2}%</em>}
                  {h.hrv != null && <em>HRV {h.hrv}</em>}
                  {h.active_energy != null && <em>{h.active_energy} kcal</em>}
                  {h.note && <em>📝 {h.note}</em>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="wear-foot">
        真·实时手表同步基于标准蓝牙心率广播(GATT 0x180D)，无需安装 App（安卓 / 桌面 Chrome·Edge）。Apple Watch 因苹果限制网页无法直读，请用上方「🍎 连接 Apple Watch」经 iOS 快捷指令同步——同样进入健康档案，且可设成自动。
      </p>
    </section>
  );
}
