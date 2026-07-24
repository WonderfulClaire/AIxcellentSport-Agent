"use client";

import { useEffect, useState, useCallback } from "react";
import { getRecords, getWearable } from "../healthStore";
import ModuleIntro from "./ModuleIntro";

/* --- Types --- */
interface WeekStats {
  trainingDays: number;
  avgSleep: number;
  hrStart: number | null;
  hrEnd: number | null;
  totalSteps: number;
  avgSteps: number;
  weightStart: number | null;
  weightEnd: number | null;
  dateStart: string;
  dateEnd: string;
}

/* --- Styles (inline, black-gold luxury) --- */
const S = {
  wrapper: {
    maxWidth: 720,
    margin: "80px auto 40px",
    padding: "0 20px",
  } as React.CSSProperties,
  card: {
    background: "rgba(24,22,18,.92)",
    border: "1px solid rgba(212,175,55,.3)",
    borderRadius: 16,
    padding: "36px 32px",
    marginBottom: 24,
  } as React.CSSProperties,
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#D4AF37",
    marginBottom: 8,
    letterSpacing: 1,
  } as React.CSSProperties,
  subtitle: {
    fontSize: 13,
    color: "rgba(236,231,216,.5)",
    marginBottom: 24,
  } as React.CSSProperties,
  body: {
    color: "#ECE7D8",
    fontSize: 15,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap" as const,
  } as React.CSSProperties,
  btnRow: {
    display: "flex",
    gap: 12,
    marginTop: 24,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  btn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid #D4AF37",
    background: "rgba(212,175,55,.08)",
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
  } as React.CSSProperties,
  btnHover: {
    background: "rgba(212,175,55,.25)",
  } as React.CSSProperties,
  empty: {
    textAlign: "center" as const,
    color: "rgba(236,231,216,.6)",
    padding: "48px 20px",
    fontSize: 15,
    lineHeight: 1.8,
  } as React.CSSProperties,
  toast: {
    position: "fixed" as const,
    bottom: 32,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(212,175,55,.95)",
    color: "#0B0B0D",
    padding: "10px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
  } as React.CSSProperties,
};

/* --- Demo data generator --- */
function generateDemoRecords(): any[] {
  const now = Date.now();
  const DAY = 86400000;
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * DAY).toISOString().slice(0, 10);
    const hasTraining = Math.random() > 0.3;
    return {
      date,
      training_load: hasTraining ? Math.round(40 + Math.random() * 60) : 0,
      sleep_hours: +(5.5 + Math.random() * 3).toFixed(1),
      weight: +(68 + (Math.random() - 0.5) * 2).toFixed(1),
    };
  });
}

function generateDemoWearable(): any[] {
  const now = Date.now();
  const DAY = 86400000;
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * DAY).toISOString().slice(0, 10);
    return {
      date,
      resting_hr: Math.round(62 + Math.random() * 10 - i * 0.5),
      steps: Math.round(5000 + Math.random() * 7000),
      source: "demo",
    };
  });
}

/* --- Stats computation --- */
function computeStats(records: any[], wearable: any[]): WeekStats | null {
  const now = Date.now();
  const DAY = 86400000;
  const sevenDaysAgo = new Date(now - 7 * DAY).toISOString().slice(0, 10);

  const recentRecords = records.filter((r) => r.date >= sevenDaysAgo).sort((a, b) => a.date.localeCompare(b.date));
  const recentWearable = wearable.filter((w) => w.date >= sevenDaysAgo).sort((a, b) => a.date.localeCompare(b.date));

  if (recentRecords.length === 0 && recentWearable.length === 0) return null;

  const trainingDays = recentRecords.filter((r) => (r.training_load || 0) > 0).length;

  const sleepArr = recentRecords.filter((r) => r.sleep_hours > 0).map((r) => r.sleep_hours);
  const avgSleep = sleepArr.length > 0 ? sleepArr.reduce((a: number, b: number) => a + b, 0) / sleepArr.length : 0;

  const hrArr = recentWearable.filter((w) => w.resting_hr > 0);
  const hrStart = hrArr.length > 0 ? hrArr[0].resting_hr : null;
  const hrEnd = hrArr.length > 0 ? hrArr[hrArr.length - 1].resting_hr : null;

  const stepsArr = recentWearable.filter((w) => w.steps > 0).map((w) => w.steps);
  const totalSteps = stepsArr.reduce((a: number, b: number) => a + b, 0);
  const avgSteps = stepsArr.length > 0 ? Math.round(totalSteps / stepsArr.length) : 0;

  const weightArr = recentRecords.filter((r) => r.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
  const weightStart = weightArr.length > 0 ? weightArr[0].weight : null;
  const weightEnd = weightArr.length > 0 ? weightArr[weightArr.length - 1].weight : null;

  const allDates = [...recentRecords.map((r) => r.date), ...recentWearable.map((w) => w.date)].sort();
  const dateStart = allDates[0] || "";
  const dateEnd = allDates[allDates.length - 1] || "";

  return { trainingDays, avgSleep, hrStart, hrEnd, totalSteps, avgSteps, weightStart, weightEnd, dateStart, dateEnd };
}

/* --- Report generation (template + rules) --- */
function generateReport(stats: WeekStats): string {
  const { trainingDays, avgSleep, hrStart, hrEnd, avgSteps, weightStart, weightEnd, dateStart, dateEnd } = stats;

  const ds = dateStart.slice(5).replace("-", "/");
  const de = dateEnd.slice(5).replace("-", "/");

  let body = `\u{1F4CB} \u79C1\u4EAB\u7BA1\u5BB6 \u00B7 \u672C\u5468\u5065\u5EB7\u62A5\u544A\uFF08${ds} - ${de}\uFF09\n\n`;

  // Training
  if (trainingDays > 0) {
    body += `\u672C\u5468\u60A8\u5171\u8FDB\u884C\u4E86 ${trainingDays} \u6B21\u8BAD\u7EC3\uFF0C${trainingDays >= 4 ? "\u8868\u73B0\u51FA\u8272" : "\u7EE7\u7EED\u4FDD\u6301"}\u3002`;
  } else {
    body += `\u672C\u5468\u6682\u65E0\u8BAD\u7EC3\u8BB0\u5F55\uFF0C\u5EFA\u8BAE\u6BCF\u5468\u81F3\u5C11\u5B89\u6392 3 \u6B21\u8FD0\u52A8\u3002`;
  }

  // Sleep
  if (avgSleep > 0) {
    body += `\u5E73\u5747\u6BCF\u665A\u7761\u7720 ${avgSleep.toFixed(1)} \u5C0F\u65F6\uFF0C`;
    if (avgSleep >= 7) {
      body += `\u7761\u7720\u8D28\u91CF\u4FDD\u6301\u7A33\u5B9A\u3002`;
    } else if (avgSleep >= 6) {
      body += `\u7565\u4F4E\u4E8E\u63A8\u8350\u65F6\u957F\uFF0C\u5EFA\u8BAE\u4FDD\u6301 7 \u5C0F\u65F6\u4EE5\u4E0A\u3002`;
    } else {
      body += `\u7761\u7720\u4E0D\u8DB3\uFF0C\u9700\u91CD\u70B9\u5173\u6CE8\u4F11\u606F\u3002`;
    }
  }

  // Heart rate
  if (hrStart !== null && hrEnd !== null) {
    const diff = hrEnd - hrStart;
    body += `\u9759\u606F\u5FC3\u7387\u4ECE\u5468\u521D\u7684 ${hrStart} bpm `;
    if (diff < -2) {
      body += `\u964D\u81F3 ${hrEnd} bpm\uFF0C\u5FC3\u8840\u7BA1\u72B6\u6001\u6709\u6240\u6539\u5584\u3002`;
    } else if (diff > 2) {
      body += `\u5347\u81F3 ${hrEnd} bpm\uFF0C\u5EFA\u8BAE\u5173\u6CE8\u6062\u590D\u4E0E\u538B\u529B\u7BA1\u7406\u3002`;
    } else {
      body += `\u81F3 ${hrEnd} bpm\uFF0C\u4FDD\u6301\u5E73\u7A33\u3002`;
    }
  }

  // Steps
  if (avgSteps > 0) {
    body += `\u65E5\u5747\u6B65\u6570 ${avgSteps.toLocaleString()} \u6B65\uFF0C`;
    if (avgSteps >= 8000) {
      body += `\u8FBE\u5230\u63A8\u8350\u76EE\u6807\u3002`;
    } else {
      body += `\u5EFA\u8BAE\u589E\u52A0\u65E5\u5E38\u6D3B\u52A8\u91CF\u81F3 8,000 \u6B65\u4EE5\u4E0A\u3002`;
    }
  }

  // Weight
  if (weightStart !== null && weightEnd !== null) {
    const diff = +(weightEnd - weightStart).toFixed(1);
    if (diff < -0.3) {
      body += `\u4F53\u91CD\u4ECE ${weightStart} kg \u964D\u81F3 ${weightEnd} kg\uFF0C\u8D8B\u52BF\u826F\u597D\u3002`;
    } else if (diff > 0.3) {
      body += `\u4F53\u91CD\u4ECE ${weightStart} kg \u5347\u81F3 ${weightEnd} kg\uFF0C\u6CE8\u610F\u996E\u98DF\u63A7\u5236\u3002`;
    } else {
      body += `\u4F53\u91CD ${weightEnd} kg\uFF0C\u4FDD\u6301\u7A33\u5B9A\u3002`;
    }
  }

  // Highlights & suggestions
  body += `\n\n`;
  const highlights: string[] = [];
  const suggestions: string[] = [];

  if (trainingDays >= 4) highlights.push("\u8BAD\u7EC3\u9891\u7387\u4F18\u79C0");
  if (hrStart !== null && hrEnd !== null && hrEnd - hrStart < -2) highlights.push("\u5FC3\u7387\u8D8B\u52BF\u5411\u597D");
  if (avgSteps >= 8000) highlights.push("\u6B65\u6570\u8FBE\u6807");
  if (avgSleep >= 7.5) highlights.push("\u7761\u7720\u5145\u8DB3");

  if (avgSleep > 0 && avgSleep < 7) suggestions.push(`\u9002\u5F53\u589E\u52A0\u7761\u7720\u65F6\u957F\u81F3 7 \u5C0F\u65F6\u4EE5\u4E0A`);
  if (avgSleep >= 7 && avgSleep < 7.5) suggestions.push(`\u5C1D\u8BD5\u5C06\u7761\u7720\u63D0\u5347\u81F3 7.5 \u5C0F\u65F6\u4EE5\u4E0A`);
  if (trainingDays < 3) suggestions.push(`\u589E\u52A0\u8BAD\u7EC3\u9891\u7387\u81F3\u6BCF\u5468 3 \u6B21\u4EE5\u4E0A`);
  if (avgSteps > 0 && avgSteps < 8000) suggestions.push(`\u63D0\u9AD8\u65E5\u5E38\u6B65\u6570\u81F3 8,000 \u6B65`);
  if (hrStart !== null && hrEnd !== null && hrEnd - hrStart > 2) suggestions.push(`\u5173\u6CE8\u538B\u529B\u7BA1\u7406\uFF0C\u4FDD\u8BC1\u5145\u5206\u6062\u590D`);

  if (highlights.length === 0) highlights.push("\u575A\u6301\u8BB0\u5F55\uFF0C\u6570\u636E\u9010\u6B65\u79EF\u7D2F\u4E2D");
  if (suggestions.length === 0) suggestions.push("\u7EE7\u7EED\u4FDD\u6301\u5F53\u524D\u8282\u594F");

  body += `\u2728 \u4EAE\u70B9\uFF1A${highlights.join("\uFF0C")}\n`;
  body += `\u{1F4CC} \u5EFA\u8BAE\uFF1A${suggestions.join("\uFF1B")}\n\n`;
  body += `\u2014\u2014 \u60A8\u7684\u79C1\u4EAB\u7BA1\u5BB6`;

  return body;
}

/* --- Component --- */
export default function WeeklyReport() {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [toast, setToast] = useState("");
  const [hoverBtn, setHoverBtn] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [records, wearable] = await Promise.all([getRecords(), getWearable()]);
      const stats = computeStats(records, wearable);
      if (stats) {
        setReport(generateReport(stats));
        setHasData(true);
      } else {
        setReport("");
        setHasData(false);
      }
    } catch {
      setReport("");
      setHasData(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDemo = useCallback(() => {
    const demoRecords = generateDemoRecords();
    const demoWearable = generateDemoWearable();
    const stats = computeStats(demoRecords, demoWearable);
    if (stats) {
      setReport(generateReport(stats));
      setHasData(true);
    }
  }, []);

  const copyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setToast("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6587\u672C");
      setTimeout(() => setToast(""), 2000);
    }
  }, [report]);

  const exportTxt = useCallback(() => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `\u5468\u62A5_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast("\u5DF2\u5BFC\u51FA\u6587\u4EF6");
    setTimeout(() => setToast(""), 2000);
  }, [report]);

  const btnStyle = (key: string) => ({
    ...S.btn,
    ...(hoverBtn === key ? S.btnHover : {}),
  });

  if (loading) {
    return (
      <div style={S.wrapper}>
        <div style={S.card}>
          <div style={{ ...S.empty, padding: "32px 20px" }}>{"\u52A0\u8F7D\u4E2D..."}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrapper}>
      <ModuleIntro
        title="每周报告"
        what="汇总本周训练、睡眠、心率数据，生成可读的周报"
        how={["每周自动汇总近 7 天数据","阅读私享管家的分析总结","可复制或导出报告文本"]}
      />
      <div style={S.card}>
        <div style={S.title}>{"\u{1F4CB} \u6BCF\u5468\u5065\u5EB7\u62A5\u544A"}</div>
        <div style={S.subtitle}>{"\u6A21\u677F\u89C4\u5219\u62FC\u88C5 \u00B7 \u4E0D\u4F9D\u8D56\u5927\u6A21\u578B \u00B7 \u6570\u636E\u4E0D\u51FA\u8BBE\u5907"}</div>

        {hasData && report ? (
          <>
            <div style={S.body}>{report}</div>
            <div style={S.btnRow}>
              <button
                style={btnStyle("copy")}
                onMouseEnter={() => setHoverBtn("copy")}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={copyReport}
              >
                {"\u{1F4CB} \u590D\u5236\u62A5\u544A"}
              </button>
              <button
                style={btnStyle("export")}
                onMouseEnter={() => setHoverBtn("export")}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={exportTxt}
              >
                {"\u{1F4C4} \u5BFC\u51FA\u6587\u672C"}
              </button>
              <button
                style={btnStyle("refresh")}
                onMouseEnter={() => setHoverBtn("refresh")}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={loadData}
              >
                {"\u{1F504} \u5237\u65B0\u6570\u636E"}
              </button>
            </div>
          </>
        ) : (
          <div style={S.empty}>
            <p>{"\u6682\u65E0\u6700\u8FD1 7 \u5929\u7684\u5065\u5EB7\u6570\u636E"}</p>
            <p style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>
              {"\u8BF7\u5148\u901A\u8FC7\u300C\u53EF\u7A7F\u6234\u8BBE\u5907\u300D\u6216\u300C\u7761\u7720\u76D1\u63A7\u300D\u5F55\u5165\u6570\u636E\uFF0C\u6216\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u67E5\u770B\u793A\u4F8B\u5468\u62A5"}
            </p>
            <div style={{ marginTop: 20 }}>
              <button
                style={btnStyle("demo")}
                onMouseEnter={() => setHoverBtn("demo")}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={loadDemo}
              >
                {"\u2728 \u751F\u6210\u793A\u4F8B\u5468\u62A5"}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
