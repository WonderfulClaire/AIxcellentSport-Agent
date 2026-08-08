import type { JSX } from "react";

type Props = { onLaunch: (tab: string) => void };

// 可信高级感：健康档案如何被建立与更新 + 匿名周度变化示例
export default function CredibilitySections({ onLaunch }: Props): JSX.Element {
  const timeline = [
    { t: "建档", d: "首次评估采集身体基线、作息、目标与限制，形成初始健康档案。" },
    { t: "每日数据", d: "训练、饮食、睡眠与主观状态默认记录在本机；配置后端后才启用云同步。" },
    { t: "建议更新", d: "规则引擎依据新记录更新建议；配置 LLM 后可生成额外的文字解读。" },
    { t: "预警", d: "发现负荷过高或异常趋势时，主动提示规避与休息，而非事后补救。" },
    { t: "真人衔接", d: "触及能力边界时，整理可读摘要，协助你与专业健康服务对接。" },
  ];

  const weekly = [
    { label: "睡眠", from: "6.1h", to: "7.3h", note: "入睡时间前移 40 分钟", tone: "good" },
    { label: "压力", from: "高", to: "中", note: "新增 10 分钟呼吸与拉伸", tone: "good" },
    { label: "训练负荷", from: "偏低", to: "适中", note: "按恢复情况上调 2 次/周", tone: "good" },
    { label: "调整原因", from: "—", to: "个性化", note: "基于本周睡眠与疲劳趋势动态生成", tone: "neutral" },
  ];

  return (
    <div className="credibility-sections">
      {/* 健康档案如何被建立与更新 */}
      <section className="archive-section" id="archive">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW YOUR PROFILE EVOLVES</span>
            <h2>你的健康档案，如何被建立与更新</h2>
          </div>
          <p>一条清晰、可解释的链路——你随时可见系统为何这样判断。</p>
        </div>

        <ol className="timeline">
          {timeline.map((item, i) => (
            <li key={item.t} className={i === timeline.length - 1 ? "last" : ""}>
              <span className="tl-dot"><i /></span>
              <div className="tl-body">
                <h3>{item.t}</h3>
                <p>{item.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 匿名周度变化示例 */}
      <section className="weekly-section" id="weekly">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A WEEK IN CONTEXT · 匿名示例</span>
            <h2>看得见系统如何判断</h2>
          </div>
          <p>以下为匿名周度示例，仅展示通用变化，不含任何个人身份或隐私数据。</p>
        </div>

        <div className="weekly-card">
          <div className="weekly-head">
            <span className="case-tag">匿名周报</span>
            <span className="weekly-sub">第 6 周 · 周一回顾</span>
          </div>
          <div className="weekly-grid">
            {weekly.map((row) => (
              <div className="weekly-row" key={row.label}>
                <span className="wk-label">{row.label}</span>
                <span className="wk-from">{row.from}</span>
                <span className="wk-arrow">→</span>
                <span className={`wk-to ${row.tone}`}>{row.to}</span>
                <span className="wk-note">{row.note}</span>
              </div>
            ))}
          </div>
          <div className="weekly-foot">
            <button className="text-link-btn" onClick={() => onLaunch("dashboard")}>
              查看你的数据面板
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
