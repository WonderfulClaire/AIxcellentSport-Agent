import type { JSX } from "react";
import TrustSections from "./TrustSections";
import CredibilitySections from "./CredibilitySections";

type Props = { onLaunch: (tab: string) => void };

// 官网首页：品牌 · 单一核心承诺 · 服务闭环 · 信任 · 可信 · 预约
export default function LandingPage({ onLaunch }: Props): JSX.Element {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing">
      {/* ── 首屏：单一核心承诺 ── */}
      <section className="hero-landing" id="top">
        <div className="hero-landing-glow" aria-hidden />
        <div className="hero-landing-inner">
          <span className="eyebrow">PRIVATE HEALTH BUTLER · 私人订制</span>
          <h1>
            为你建立一套<br />
            会随身体状态<br />
            <span className="gold-text">持续调整的健康决策系统</span>
          </h1>
          <p className="hero-sub">
            不是又一款健身或饮食 App，而是一位长期、专属、懂你身体变化的健康管家——
            把训练、营养、睡眠与压力，收进一套随你状态演进的方案里。
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onLaunch("assess")}>
              开始 3 分钟私人评估 <span>→</span>
            </button>
            <button className="text-link-btn" onClick={() => scrollTo("service-loop")}>
              查看服务方式
            </button>
          </div>
          <div className="trust-row">
            <span><b>1 对 1</b> 私人订制</span>
            <span><b>本地</b> 优先存储</span>
            <span><b>持续</b> 状态调整</span>
          </div>
        </div>
      </section>

      {/* ── 服务闭环：建档 / 设计 / 陪伴 ── */}
      <section className="service-loop" id="service-loop">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW THE SERVICE WORKS</span>
            <h2>让每个人都拥有自己的健康思享管家</h2>
          </div>
          <p>高端不是门槛，而是本该属于每个人的生活标配。</p>
        </div>

        <div className="loop-grid">
          <article className="loop-card">
            <span className="loop-step">01</span>
            <h3>建档</h3>
            <p className="loop-lead">先把你「读」懂</p>
            <ul>
              <li>身体基础与体能基线</li>
              <li>作息、饮食与压力习惯</li>
              <li>目标，以及需要规避的限制</li>
            </ul>
          </article>

          <article className="loop-card">
            <span className="loop-step">02</span>
            <h3>设计</h3>
            <p className="loop-lead">为你一人定制</p>
            <ul>
              <li>营养方案与每日膳食结构</li>
              <li>训练计划与动作编排</li>
              <li>睡眠与压力调节策略</li>
            </ul>
          </article>

          <article className="loop-card">
            <span className="loop-step">03</span>
            <h3>陪伴</h3>
            <p className="loop-lead">随状态持续演进</p>
            <ul>
              <li>每日调整与轻量提醒</li>
              <li>异常预警与风险规避</li>
              <li>必要时衔接真人健康服务</li>
            </ul>
          </article>
        </div>
      </section>

      {/* ── 专业背书 / 隐私安全 / 案例 ── */}
      <TrustSections />

      {/* ── 可信高级感：档案时间线 + 周度示例 ── */}
      <CredibilitySections onLaunch={onLaunch} />

      {/* ── 预约 ── */}
      <section className="booking-section" id="booking">
        <div className="booking-inner">
          <div>
            <span className="eyebrow">BEGIN YOUR MEMBERSHIP</span>
            <h2>先做一次私人健康咨询</h2>
            <p>用一次对话，让管家了解你的身体、作息与目标，生成属于你的第一份健康档案。</p>
          </div>
          <button className="primary-button" onClick={() => onLaunch("assess")}>
            预约 3 分钟评估 <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
