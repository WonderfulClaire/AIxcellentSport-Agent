"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: "您的私享健康管家",
    subtitle: "把私人教练、营养师、医生、形象顾问收进一个 App",
    icon: "✨🏆",
  },
  {
    id: 2,
    title: "三步开始",
    steps: [
      { icon: "📋", text: "建档 —— 3 分钟填写健康基础信息" },
      { icon: "🎯", text: "订制方案 —— 为你生成专属计划" },
      { icon: "🤝", text: "持续陪伴 —— 日常追踪、智能提醒" },
    ],
  },
  {
    id: 3,
    title: "隐私承诺",
    icon: "🔒",
    promises: [
      { icon: "🛡️", text: "您的数据优先存储在本设备" },
      { icon: "🔐", text: "不上传任何未经授权的信息" },
    ],
  },
  {
    id: 4,
    title: "准备好了吗？",
    subtitle: "只需 3 分钟，为你量身打造健康方案",
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | "none">("none");
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback(
    (index: number, dir?: "left" | "right") => {
      if (animating || index === current) return;
      if (index < 0 || index >= slides.length) return;
      setDirection(dir || (index > current ? "left" : "right"));
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 280);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    if (current < slides.length - 1) goTo(current + 1, "left");
  }, [current, goTo]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1, "right");
  }, [current, goTo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onComplete]);

  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? direction === "left"
        ? "translateX(-30px)"
        : "translateX(30px)"
      : "translateX(0)",
    transition: "opacity 0.28s ease, transform 0.28s ease",
  };

  return (
    <div className="onboarding-overlay">
      <div
        className="onboarding-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {current < slides.length - 1 && (
          <button className="onboarding-skip" onClick={onComplete}>
            跳过
          </button>
        )}

        <div className="onboarding-slide" style={slideStyle}>
          {current === 0 && (
            <div className="slide-center">
              <span className="slide-icon-large">✨🏆</span>
              <h1 className="slide-title">您的私享健康管家</h1>
              <p className="slide-subtitle">
                把私人教练、营养师、医生、形象顾问收进一个 App
              </p>
            </div>
          )}

          {current === 1 && (
            <div className="slide-center">
              <h1 className="slide-title">三步开始</h1>
              <div className="slide-steps">
                <div className="step-item">
                  <span className="step-icon">📋</span>
                  <span className="step-text">建档 —— 3 分钟填写健康基础信息</span>
                </div>
                <div className="step-item">
                  <span className="step-icon">🎯</span>
                  <span className="step-text">订制方案 —— 为你生成专属计划</span>
                </div>
                <div className="step-item">
                  <span className="step-icon">🤝</span>
                  <span className="step-text">持续陪伴 —— 日常追踪、智能提醒</span>
                </div>
              </div>
            </div>
          )}

          {current === 2 && (
            <div className="slide-center">
              <span className="slide-icon-large">🔒</span>
              <h1 className="slide-title">隐私承诺</h1>
              <div className="slide-privacy">
                <div className="privacy-item">
                  <span className="privacy-icon">🛡️</span>
                  <span className="privacy-text">您的数据优先存储在本设备</span>
                </div>
                <div className="privacy-item">
                  <span className="privacy-icon">🔐</span>
                  <span className="privacy-text">不上传任何未经授权的信息</span>
                </div>
              </div>
            </div>
          )}

          {current === 3 && (
            <div className="slide-center">
              <h1 className="slide-title">准备好了吗？</h1>
              <p className="slide-subtitle">只需 3 分钟，为你量身打造健康方案</p>
              <div className="slide-actions">
                <button className="onboarding-start-btn" onClick={onComplete}>
                  开始 3 分钟评估
                </button>
                <button className="onboarding-skip-link" onClick={onComplete}>
                  稍后再说
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`第 ${i + 1} 页`}
            />
          ))}
        </div>
      </div>

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: #0B0B0D;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: onb-fade-in 0.4s ease;
        }
        @keyframes onb-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .onboarding-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          height: 100%;
          max-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          box-sizing: border-box;
          overflow: hidden;
          touch-action: pan-y;
        }
        .onboarding-skip {
          position: absolute;
          top: env(safe-area-inset-top, 1rem);
          right: 1.5rem;
          margin-top: 1rem;
          background: none;
          border: none;
          color: #ECE7D8;
          opacity: 0.6;
          font-size: 0.95rem;
          cursor: pointer;
          padding: 0.5rem;
          transition: opacity 0.2s;
        }
        .onboarding-skip:hover { opacity: 1; }
        .onboarding-slide {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .slide-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.2rem;
          padding: 0 0.5rem;
        }
        .slide-icon-large {
          font-size: 3.2rem;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        .slide-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #D4AF37;
          margin: 0;
          line-height: 1.3;
        }
        .slide-subtitle {
          font-size: 1rem;
          color: #ECE7D8;
          opacity: 0.85;
          margin: 0;
          line-height: 1.6;
          max-width: 320px;
        }
        .slide-steps {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-top: 0.8rem;
          width: 100%;
          max-width: 300px;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          text-align: left;
        }
        .step-icon {
          font-size: 1.6rem;
          flex-shrink: 0;
        }
        .step-text {
          color: #ECE7D8;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .slide-privacy {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .privacy-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .privacy-icon {
          font-size: 1.4rem;
          flex-shrink: 0;
        }
        .privacy-text {
          color: #ECE7D8;
          font-size: 0.95rem;
        }
        .slide-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .onboarding-start-btn {
          background: #D4AF37;
          color: #0B0B0D;
          border: none;
          border-radius: 8px;
          padding: 0.85rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .onboarding-start-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
        }
        .onboarding-start-btn:active {
          transform: translateY(0);
        }
        .onboarding-skip-link {
          background: none;
          border: none;
          color: #ECE7D8;
          opacity: 0.5;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0.4rem;
          transition: opacity 0.2s;
        }
        .onboarding-skip-link:hover { opacity: 0.8; }
        .onboarding-dots {
          display: flex;
          gap: 0.6rem;
          padding-bottom: env(safe-area-inset-bottom, 2rem);
          margin-top: 1.5rem;
        }
        .onboarding-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 1.5px solid #D4AF37;
          background: transparent;
          opacity: 0.4;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.25s, background 0.25s, transform 0.25s;
        }
        .onboarding-dot.active {
          background: #D4AF37;
          opacity: 1;
          transform: scale(1.2);
        }
        .onboarding-dot:hover:not(.active) {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
