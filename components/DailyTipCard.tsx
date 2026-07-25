"use client";

import { useEffect, useState } from "react";
import { fetchDailyTip, type DailyTip } from "../lib/healthApi";

/**
 * 每日健康小推送卡片（云端能力）。
 *
 * - 仅在用户已登录（localStorage 含 aix_auth_token）时展示；未登录或后端不可达时
 *   返回 null，对"本地优先"的主流程零侵入、零占位。
 * - 数据来自后端 GET /api/health/daily-tip，按用户画像 + 近期习惯筛选。
 *
 * 挂载方式（在 page.tsx 顶部 import，并在合适位置渲染）：
 *   import DailyTipCard from "./components/DailyTipCard";
 *   ...
 *   {activeTab === "doctor" && (<><DailyTipCard /><HealthConcierge /></>)}
 * 也可放在"实时训练"首页 hero 区上方，作为每日到访的第一眼内容。
 */
export default function DailyTipCard() {
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchDailyTip()
      .then((t) => {
        if (alive) {
          setTip(t);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  // 未登录 / 后端不可达：展示示例占位，让功能可见、可演示（登录后按画像个性化）
  if (!tip) {
    return (
      <section className="aix-dailytip aix-dailytip--placeholder" aria-label="每日健康小推送（示例）">
        <style>{css}</style>
        <div className="aix-dt-inner">
          <div className="aix-dt-body">
            <div className="aix-dt-head">
              <span className="aix-dt-tag">今日健康小推送</span>
              <span className="aix-dt-date">示例 · 登录后个性化</span>
            </div>
            <h3 className="aix-dt-title">用 90 分钟节律工作，精力比硬扛更持久</h3>
            <p className="aix-dt-text">大脑专注约以 90 分钟为周期起伏。每完成一个周期主动休息 10–15 分钟（离开屏幕、走动、喝水），比连续硬扛更能维持全天高精力；研究也显示 20–30 分钟规律午睡可提升下午警觉度。</p>
            <p className="aix-dt-source">来源：超日节律（ultradian rhythm）研究 · 登录后按你的画像推送</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="aix-dailytip" aria-label="今日健康小推送">
      <style>{css}</style>
      <div className="aix-dt-inner">
        <div className="aix-dt-emoji" aria-hidden>
          {tip.emoji || "🌿"}
        </div>
        <div className="aix-dt-body">
          <div className="aix-dt-head">
            <span className="aix-dt-tag">今日健康小推送</span>
            {tip.date && <span className="aix-dt-date">{tip.date}</span>}
          </div>
          <h3 className="aix-dt-title">{tip.title}</h3>
          <p className="aix-dt-text">{tip.body}</p>
          {tip.source && <p className="aix-dt-source">来源：{tip.source}</p>}
        </div>
      </div>
    </section>
  );
}

const css = `
.aix-dailytip { --acid:#b7ff2a; --ink:#071521; --muted:#667f92;
  max-width: 1180px; margin: 18px auto 0; padding: 0 5vw; font-family: Arial, Helvetica, sans-serif; }
.aix-dt-inner { display:flex; gap:16px; align-items:flex-start;
  border:1px solid rgba(7,21,33,.13); border-left:5px solid var(--acid);
  border-radius:14px; background:#fff; padding:18px 20px; box-shadow:0 1px 0 rgba(7,21,33,.04); }
.aix-dt-emoji { font-size:34px; line-height:1; flex:0 0 auto; }
.aix-dt-body { flex:1; min-width:0; }
.aix-dt-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
.aix-dt-tag { display:inline-block; font:800 11px/1 monospace; letter-spacing:.14em; text-transform:uppercase;
  color:#0a3d1f; background:var(--acid); padding:5px 8px; border-radius:6px; }
.aix-dt-date { color:var(--muted); font-size:12px; }
.aix-dt-title { margin:0 0 8px; font-size:18px; letter-spacing:-.01em; color:var(--ink); }
.aix-dt-text { margin:0; color:#2b3a47; font-size:14px; line-height:1.7; }
.aix-dt-source { margin:10px 0 0; color:#9aa9b5; font-size:12px; }
@media (max-width:620px){ .aix-dt-inner{ padding:14px; } .aix-dt-title{ font-size:16px; } }
`;
