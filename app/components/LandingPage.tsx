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
          <span className="eyebrow">LOCAL-FIRST MOTION COACH · 浏览器端动作教练</span>
          <h1>
            让摄像头看懂动作<br />
            让每一次反馈<br />
            <span className="gold-text">都有指标与规则可解释</span>
          </h1>
          <p className="hero-sub">
            MediaPipe 在浏览器端提取姿态关键点，CoachAgent 把动作阶段、问题标签与历史记录
            组合成个性化反馈。无需账号或 API Key，原始摄像头帧默认不上传。
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onLaunch("assess")}>
              开始动作评估 <span>→</span>
            </button>
            <button className="text-link-btn" onClick={() => scrollTo("service-loop")}>
              查看服务方式
            </button>
          </div>
          <div className="trust-row">
            <span><b>33 点</b> 姿态追踪</span>
            <span><b>本地</b> 默认处理</span>
            <span><b>可解释</b> 规则反馈</span>
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
