import type { JSX } from "react";

// 专业背书 / 隐私安全 / 案例展示 —— 黑金质感信任区块
export default function TrustSections(): JSX.Element {
  return (
    <div className="trust-sections">
      {/* ── 专业背书板块 ── */}
      <section className="endorse-section" id="endorse">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PROFESSIONAL BACKING</span>
            <h2>专业背书，安心托付</h2>
          </div>
          <p>每一个模块都建立在可被验证的专业标准之上，而非凭空而来。</p>
        </div>

        <div className="endorse-grid">
          <article className="endorse-card">
            <span className="endorse-icon">🏋️</span>
            <h3>训练体系</h3>
            <p className="endorse-lead">对标线下私教标准</p>
            <ul>
              <li>标准动作库 <b>200+</b>，覆盖力量、体态、有氧全场景</li>
              <li>动作矫正逻辑基于<b>运动解剖学</b>，逐关节评估轨迹</li>
              <li>实时反馈替代肉眼盯练，动作标准度可量化</li>
            </ul>
          </article>

          <article className="endorse-card">
            <span className="endorse-icon">🥗</span>
            <h3>营养膳食</h3>
            <p className="endorse-lead">遵循国标膳食指南</p>
            <ul>
              <li>依据《中国居民膳食指南》定制饮食方案</li>
              <li>热量 / 蛋白 / 碳水 / 脂肪结构可视化追踪</li>
              <li>结合目标与体质，给出可执行的一日三餐</li>
            </ul>
          </article>

          <article className="endorse-card">
            <span className="endorse-icon">🌿</span>
            <h3>中医养生</h3>
            <p className="endorse-lead">依节气 · 重居家调理</p>
            <ul>
              <li>遵循<b>二十四节气</b>传统养生理论</li>
              <li>提供居家调理方案：食疗、穴位、起居</li>
              <li>仅作养生参考，<b>不涉及处方药与诊疗</b></li>
            </ul>
          </article>
        </div>
      </section>

      {/* ── 隐私安全专区 ── */}
      <section className="privacy-section" id="privacy">
        <div className="privacy-inner">
          <div className="privacy-mark">🔒</div>
          <div className="privacy-text">
            <span className="eyebrow">PRIVACY &amp; SECURITY · 具体承诺</span>
            <h2>你的健康数据，只属于你</h2>
            <p>
              所有体态视频、饮食记录、睡眠数据均<b>加密存储于我们的云端服务器</b>，
              按你的账号<b>严格隔离</b>；传输全程 HTTPS，仅你本人凭账号可访问，
              从机制上保护你的个人健康隐私。
            </p>
          </div>
          <ul className="privacy-points">
            <li><i /> 云端加密存储 · 账号隔离</li>
            <li><i /> HTTPS 传输 · 全程加密</li>
            <li><i /> 无广告 · 不向第三方共享</li>
          </ul>
        </div>

        <div className="privacy-promises">
          <div className="promise">
            <span className="promise-k">数据存于何处</span>
            <span className="promise-v">加密存储于我们的云端服务器，按你的账号严格隔离，彼此互不可见。</span>
          </div>
          <div className="promise">
            <span className="promise-k">如何导出 / 删除</span>
            <span className="promise-v">可在账户设置中随时导出，或彻底删除全部健康数据，我们不留副本。</span>
          </div>
          <div className="promise">
            <span className="promise-k">是否共享</span>
            <span className="promise-v">数据仅在你的加密通道中读写，不向任何第三方共享或出售。</span>
          </div>
          <div className="promise warning">
            <span className="promise-k">何时该就医</span>
            <span className="promise-v">持续疼痛、不明肿块、胸闷或急性症状——请直接前往正规医疗机构，本服务不替代诊断。</span>
          </div>
        </div>

        <p className="privacy-disclaimer">
          ✦ 本产品提供的是<b>健康咨询与就医准备支持</b>，而非诊疗。所有建议仅作日常养护参考；
          涉及处方药、疾病诊断与治疗方案，须由具备资质的医生当面完成。
        </p>
      </section>

      {/* ── 案例展示区 ── */}
      <section className="cases-section" id="cases">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RESULTS · 通用参考</span>
            <h2>看得见的日常改变</h2>
          </div>
          <p>以下为通用变化示意，仅供参考，个体差异请以自身情况为准。</p>
        </div>

        <div className="case-grid">
          <article className="case-card">
            <span className="case-tag">精力管理</span>
            <h3>上班族疲劳调理</h3>
            <p className="case-metric"><b>30 天</b> 周期性精力提升</p>
            <p className="case-desc">
              针对久坐与作息紊乱，定制日常活动与恢复节奏，
              普遍反馈白天更清醒、下班后更有余力。
            </p>
            <div className="case-bar"><i style={{ width: "78%" }} /></div>
            <small>精力状态 · 参考提升</small>
          </article>

          <article className="case-card">
            <span className="case-tag">体态矫正</span>
            <h3>圆肩驼背改善</h3>
            <p className="case-metric"><b>4 周</b> 周期性姿态对比</p>
            <p className="case-desc">
              通过每日针对性动作与姿态提醒，肩颈线条更舒展，
              久坐后的僵硬感普遍减轻。
            </p>
            <div className="case-bar"><i style={{ width: "64%" }} /></div>
            <small>姿态舒展度 · 参考提升</small>
          </article>

          <article className="case-card">
            <span className="case-tag">膳食计划</span>
            <h3>减脂定制膳食</h3>
            <p className="case-metric"><b>12 周</b> 周期性体态变化</p>
            <p className="case-desc">
              基于膳食指南的定制饮食，结构清晰、容易坚持，
              腰腹围度与体感轻盈度出现可见变化。
            </p>
            <div className="case-bar"><i style={{ width: "71%" }} /></div>
            <small>体感轻盈度 · 参考提升</small>
          </article>
        </div>
      </section>
    </div>
  );
}
