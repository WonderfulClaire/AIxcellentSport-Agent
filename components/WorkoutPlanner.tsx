"use client";

import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════
// 训练计划系统 — 对标 Codex 完整训练计划界面
// ═══════════════════════════════════════════════════

export default function WorkoutPlanner() {
  const [step, setStep] = useState<"config" | "plan" | "detail">("config");
  const [profile, setProfile] = useState({
    goal: "balanced",
    level: "intermediate",
    daysPerWeek: 3,
    duration: 45,
    equipment: "bodyweight",
  });
  const [selectedDay, setSelectedDay] = useState(0);
  const [showWarmup, setShowWarmup] = useState(true);
  const [showStretch, setShowStretch] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);

  // 生成计划
  const handleGenerate = () => {
    // 动态导入引擎（避免SSR问题）
    import("../agent/workoutPlanner").then(({ generateWorkoutPlan }) => {
      const result = generateWorkoutPlan(profile);
      setPlan(result);
      setStep("plan");
    });
  };

  // 当前选中的训练日
  const currentDay = useMemo(() => {
    if (!plan?.schedule || !plan.schedule[selectedDay]) return null;
    return plan.schedule[selectedDay];
  }, [plan, selectedDay]);

  // 总统计
  const stats = useMemo(() => {
    if (!plan?.schedule) return { totalExercises: 0, totalSets: 0, estimatedMin: 0 };
    let ex = 0, sets = 0;
    plan.schedule.forEach((day: any) => {
      day.exercises?.forEach((e: any) => { ex++; sets += e.sets || 1; });
    });
    return { totalExercises: ex, totalSets: sets, estimatedMin: sets * 2 + 10 };
  }, [plan]);

  // ─── 配置页 ───
  if (step === "config") {
    return (
      <div className="wp-container">
        <div className="wp-header">
          <h2>📋 AI 训练计划生成器</h2>
          <p>回答几个问题，为你生成专属训练方案（对标专业教练的计划设计）</p>
        </div>

        <div className="wp-config">
          {/* 目标 */}
          <section className="wp-section">
            <h3>🎯 你的主要目标</h3>
            <div className="wp-options">
              {[
                { key: "fat_loss", label: "减脂塑形", icon: "🔥", desc: "燃烧脂肪 + 保持肌肉" },
                { key: "muscle_gain", label: "增肌增力", icon: "💪", desc: "增加肌肉量 + 提升力量" },
                { key: "balanced", label: "均衡健康", icon: "⚖️", desc: "全面提升身体素质" },
                { key: "posture", label: "体态矫正", icon: "🧍", desc: "改善圆肩/驼背/骨盆问题" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`wp-option ${profile.goal === opt.key ? "active" : ""}`}
                  onClick={() => setProfile({ ...profile, goal: opt.key })}
                >
                  <span className="wp-option-icon">{opt.icon}</span>
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </button>
              ))}
            </div>
          </section>

          {/* 水平 */}
          <section className="wp-section">
            <h3>📊 你的训练水平</h3>
            <div className="wp-toggle">
              {[
                { key: "beginner", label: "新手（&lt;6个月）" },
                { key: "intermediate", label: "中级（6-24个月）" },
                { key: "advanced", label: "高级（2年+）" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={profile.level === opt.key ? "active" : ""}
                  onClick={() => setProfile({ ...profile, level: opt.key })}
                  dangerouslySetInnerHTML={{ __html: opt.label }}
                />
              ))}
            </div>
          </section>

          {/* 频率 & 时长 */}
          <section className="wp-section wp-grid-2">
            <div>
              <h3>📅 每周训练天数</h3>
              <div className="wp-toggle">
                {[2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    className={profile.daysPerWeek === d ? "active" : ""}
                    onClick={() => setProfile({ ...profile, daysPerWeek: d })}
                  >
                    {d} 天/周
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>⏱️ 单次时长偏好</h3>
              <div className="wp-toggle">
                {[30, 45, 60].map((d) => (
                  <button
                    key={d}
                    className={profile.duration === d ? "active" : ""}
                    onClick={() => setProfile({ ...profile, duration: d })}
                  >
                    {d} 分钟
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 器材 */}
          <section className="wp-section">
            <h3>🏋️ 可用器材</h3>
            <div className="wp-toggle">
              {[
                { key: "bodyweight", label: "仅自重" },
                { key: "dumbbells", label: "哑铃" },
                { key: "full", label: "健身房全套" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={profile.equipment === opt.key ? "active" : ""}
                  onClick={() => setProfile({ ...profile, equipment: opt.key })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <button className="wp-generate-btn" onClick={handleGenerate}>
            ✨ 生成我的专属训练计划
          </button>
        </div>

        {/* 使用方式提示（对标截图3） */}
        <div className="wp-usage-tips">
          <h4>💡 使用方式</h4>
          <ol>
            <li><strong>每周按 A/B 轮换训练</strong>，同一肌群间隔至少 48 小时恢复</li>
            <li><strong>感觉动作不对时</strong>，拍一条视频上传到「视频分析」Tab 让 AI 纠正</li>
            <li><strong>每个动作卡片可查看详细说明</strong>，含针对部位、好处、常见错误和教学视频链接</li>
            <li><strong>每练完一次</strong>，到「训练记录」Tab 打卡记录组数和感受</li>
          </ol>
        </div>
      </div>
    );
  }

  // ─── 计划总览页 ───
  if (step === "plan") {
    return (
      <div className="wp-container">
        <div className="wp-header">
          <h2>📋 你的专属训练计划</h2>
          <p>
            {profile.goal === "fat_loss" && "减脂塑形"}
            {profile.goal === "muscle_gain" && "增肌增力"}
            {profile.goal === "balanced" && "均衡健康"}
            {profile.goal === "posture" && "体态矫正"}
            {" · "}{profile.daysPerWeek}天/周 · 约{stats.estimatedMin}min/次
          </p>
        </div>

        {/* 统计概览（对标截图1顶部） */}
        <div className="wp-stats-bar">
          <div className="wp-stat">
            <span className="wp-stat-val">{plan.schedule.length}</span>
            <span className="wp-stat-label">训练日</span>
          </div>
          <div className="wp-stat">
            <span className="wp-stat-val">{stats.totalExercises}</span>
            <span className="wp-stat-label">不同动作</span>
          </div>
          <div className="wp-stat">
            <span className="wp-stat-val">{stats.totalSets}</span>
            <span className="wp-stat-label">总组数</span>
          </div>
          <div className="wp-stat">
            <span className="wp-stat-val">{stats.estimatedMin}</span>
            <span className="wp-stat-label">分钟/次(估)</span>
          </div>
          <div className="wp-stat">
            <span className="wp-stat-val">{profile.level === "beginner" ? "低" : profile.level === "intermediate" ? "中" : "高"}</span>
            <span className="wp-stat-label">难度</span>
          </div>
        </div>

        {/* 训练日选择（A/B Tab） */}
        <div className="wp-day-tabs">
          {plan.schedule.map((day: any, idx: number) => (
            <button
              key={idx}
              className={`wp-day-tab ${selectedDay === idx ? "active" : ""}`}
              onClick={() => { setSelectedDay(idx); setStep("detail"); }}
            >
              <strong>{day.label}</strong>
              <span>{day.name || day.type}</span>
              <small>{day.focus || day.exercises?.length + "个动作"}</small>
            </button>
          ))}
        </div>

        {/* 训练指南 */}
        {plan.guidelines && (
          <div className="wp-guidelines">
            <h4>📌 训练指南</h4>
            <div className="wp-guide-grid">
              <div className="wp-guide-item">
                <strong>频率</strong>
                <p>{plan.guidelines.frequency}</p>
              </div>
              <div className="wp-guide-item">
                <strong>进阶</strong>
                <p>{plan.guidelines.progression}</p>
              </div>
              <div className="wp-guide-item">
                <strong>强度</strong>
                <p>{plan.guidelines.intensity}</p>
              </div>
            </div>
            <ul className="wp-tips-list">
              {plan.guidelines.tips?.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 热身预览 */}
        {showWarmup && plan.warmup && (
          <div className="wp-warmup-preview">
            <div className="wp-subheader">
              <h4>🔥 开始前热身（每次必做）</h4>
              <button onClick={() => setShowWarmup(false)}>收起</button>
            </div>
            <div className="wp-warmup-grid">
              {plan.warmup.slice(0, 4).map((w: any, i: number) => (
                <div key={i} className="wp-warmup-item">
                  <strong>{w.name}</strong>
                  <span className="wp-duration">{w.duration}</span>
                  <span className="wp-target">{w.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="wp-restart-btn" onClick={() => setStep("config")}>重新配置</button>
      </div>
    );
  }

  // ─── 单日详情页（对标截图4） ───
  if (step === "detail" && currentDay) {
    return (
      <div className="wp-container">
        {/* 头部导航 */}
        <div className="wp-detail-header">
          <button className="wp-back-btn" onClick={() => setStep("plan")}>← 返回总览</button>
          <h2>{currentDay.name} · 第{currentDay.day}天</h2>
          <span className={`wp-day-badge type-${currentDay.type === "A" ? "a" : currentDay.type === "B" ? "b" : "other"}`}>
            {currentDay.type}
          </span>
        </div>
        <p className="wp-focus-text">重点：{currentDay.focus}</p>

        {/* 热身板块（对标截图3） */}
        {showWarmup && (
          <div className="wp-block wp-warmup-block">
            <div className="wp-subheader">
              <h4>🔥 开始前热身</h4>
              <button onClick={() => setShowWarmup(!showWarmup)}>{showWarmup ? "收起" : "展开"}</button>
            </div>
            <p className="wp-block-desc">按顺序完成以下热身动作，唤醒目标肌群并提升关节活动度。</p>
            <div className="wp-warmup-full-grid">
              {(plan?.warmup || WARMUP_ROUTINE_DEFAULT).map((w: any, i: number) => (
                <div key={i} className="wp-warmup-card">
                  <div className="wp-warmup-card-head">
                    <strong>{w.name}</strong>
                    <span className="wp-tag cat">{w.category}</span>
                    <span className="wp-tag dur">{w.duration}</span>
                  </div>
                  <p className="wp-warmup-desc">{w.description}</p>
                  <div className="wp-warmup-benefit">
                    <span className="wp-benefit-label">好处：</span>
                    {w.benefit}
                  </div>
                  <div className="wp-warmup-targets">
                    <span className="wp-target-label">针对：</span>
                    {w.target}
                  </div>
                  <div className="wp-warmup-actions">
                    <button className="wp-action-btn">本地图文</button>
                    <button className="wp-action-btn primary">卡片内嵌版</button>
                    <button className="wp-action-btn">更多视频</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 正式训练动作网格（对标截图4） */}
        <div className="wp-block wp-exercises-block">
          <div className="wp-subheader">
            <h4>🏋️ 正式训练</h4>
            <span>{currentDay.exercises?.length || 0} 个动作</span>
          </div>
          <div className="wp-exercises-grid">
            {currentDay.exercises?.map((ex: any, idx: number) => (
              <div
                key={idx}
                className={`wp-exercise-card level-${ex.level || "初"} ${expandedExercise === ex.name ? "expanded" : ""}`}
                onClick={() => setExpandedExercise(expandedExercise === ex.name ? null : ex.name)}
              >
                {/* 卡片头部 */}
                <div className="wp-ex-card-head">
                  <h5>{ex.name}</h5>
                  <div className="wp-ex-tags">
                    <span className={`wp-level-tag lvl-${ex.level || "初"}`}>{ex.level || "初"}</span>
                    <span className="wp-set-info">{ex.sets} × {ex.reps}</span>
                    <span className="wp-rest-info">休息 {ex.rest || "60s"}</span>
                  </div>
                </div>

                {/* 针对部位 */}
                <div className="wp-ex-targets">
                  {ex.target?.map((t: string, ti: number) => (
                    <span key={ti} className="wp-target-chip">{t}</span>
                  ))}
                </div>

                {/* 展开详情 */}
                {expandedExercise === ex.name && (
                  <div className="wp-ex-detail">
                    <div className="wp-ex-row">
                      <span className="wp-ex-label">针对部位</span>
                      <span>{ex.muscles || ex.target?.join(" · ")}</span>
                    </div>
                    <div className="wp-ex-row">
                      <span className="wp-ex-label">好处</span>
                      <p>{ex.benefit || "强化目标肌群，提升力量与协调性。"}</p>
                    </div>
                    {ex.tips && (
                      <div className="wp-ex-row">
                        <span className="wp-ex-label">要点</span>
                        <ul>
                          {ex.tips.map((tip: string, ti: number) => <li key={ti}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                    {ex.commonMistakes && (
                      <div className="wp-ex-row">
                        <span className="wp-ex-label warn">常见错误</span>
                        <ul className="warn-list">
                          {ex.commonMistakes.map((m: string, mi: number) => <li key={mi}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="wp-ex-actions">
                      <button className="wp-action-btn">本地图文</button>
                      <button className="wp-action-btn primary">卡片内嵌版</button>
                      <button className="wp-action-btn">更多视频</button>
                      {ex.videoQuery && (
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.videoQuery)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="wp-action-btn link"
                        >
                          YouTube 教学 ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 训后拉伸（对标截图4底部） */}
        {showStretch && currentDay.stretches && (
          <div className="wp-block wp-stretch-block">
            <div className="wp-subheader">
              <h4>🧘 训练后拉伸</h4>
              <button onClick={() => setShowStretch(!showStretch)}>{showStretch ? "收起" : "展开"}</button>
            </div>
            <p className="wp-block-desc">训练后进行静态拉伸，帮助恢复、减少酸痛、保持柔韧性。</p>
            <div className="wp-stretch-grid">
              {currentDay.stretches.map((s: any, i: number) => (
                <div key={i} className="wp-stretch-card">
                  <strong>{s.name}</strong>
                  <span className="wp-duration">{s.duration}</span>
                  <span className="wp-target">{s.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 切换到其他训练日 */}
        <div className="wp-day-nav">
          {plan?.schedule?.map((_d: any, idx: number) => (
            <button
              key={idx}
              className={selectedDay === idx ? "active" : ""}
              onClick={() => setSelectedDay(idx)}
            >
              {_d.label}
            </button>
          ))}
        </div>

        <button className="wp-restart-btn" onClick={() => setStep("config")}>重新生成计划</button>
      </div>
    );
  }

  return null;
}

// 默认热身数据（静态兜底）
const WARMUP_ROUTINE_DEFAULT = [
  { name: "手指环绕", duration: "1分钟", target: "手指灵活性", description: "双手十指交叉旋转。", benefit: "唤醒手部小肌群。", category: "关节活动" },
  { name: "手腕拉伸", duration: "1分钟", target: "腕关节", description: "手腕前后拉伸。", benefit: "预防手腕疼痛。", category: "关节活动" },
  { name: "肩胛骨回缩", duration: "1分钟", target: "肩胛骨·上背", description: "双肩向后夹紧。", benefit: "激活菱形肌。", category: "激活" },
  { name: "徒手臂桥", duration: "2×8-12", target: "臀部·腘绳肌", description: "仰卧屈膝臀桥。", benefit: "激活臀部。", category: "激活" },
  { name: "分腿蹲空动作", duration: "每侧8次", target: "髋关节", description: "宽站姿侧向下蹲。", benefit: "打开髋关节。", category: "动态拉伸" },
];
