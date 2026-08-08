import type { JSX } from "react";

// 设计依据 / 隐私安全 / 产品演示 —— 黑金质感信任区块
export default function TrustSections(): JSX.Element {
  return (
    <div className="trust-sections">
      {/* ── 专业背书板块 ── */}
      <section className="endorse-section" id="endorse">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DESIGN BASIS</span>
            <h2>规则从哪里来，边界写在哪里</h2>
          </div>
          <p>公开实现中的输入、规则与能力边界都可以被检查，而不是只给出不可解释的结论。</p>
        </div>

        <div className="endorse-grid">
          <article className="endorse-card">
            <span className="endorse-icon">🏋️</span>
            <h3>训练体系</h3>
            <p className="endorse-lead">可解释的动作规则</p>
            <ul>
              <li>标准动作库 <b>200+</b>，覆盖力量、体态、有氧全场景</li>
              <li>动作反馈由关节角度、动作阶段和问题标签共同生成</li>
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
              默认演示模式下，摄像头推理和结构化记录都在<b>你的浏览器</b>完成；
              原始摄像头帧<b>不上传、不持久化</b>。只有主动配置后端或 LLM 时，
              对应的结构化数据才会发送到你选择的服务。
            </p>
          </div>
          <ul className="privacy-points">
            <li><i /> 默认本地存储 · 无需账号</li>
            <li><i /> 原始视频帧不上传</li>
            <li><i /> 云端与 LLM 均为可选配置</li>
          </ul>
        </div>

        <div className="privacy-promises">
          <div className="promise">
            <span className="promise-k">数据存于何处</span>
            <span className="promise-v">默认保存在浏览器 localStorage；配置 VITE_API_BASE 后，结构化记录可同步到自托管后端。</span>
          </div>
          <div className="promise">
            <span className="promise-k">如何导出 / 删除</span>
            <span className="promise-v">本地模式可在设置中导出或清除；云端模式的数据保留与备份策略由实际部署方负责。</span>
          </div>
          <div className="promise">
            <span className="promise-k">是否共享</span>
            <span className="promise-v">默认不发送；启用 LLM 后，结构化文字指标会发送到你配置的模型服务，须同时阅读其隐私政策。</span>
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
            <h2>看得见系统如何工作</h2>
          </div>
          <p>以下是功能演示场景与模拟指标，不是用户案例、临床结论或效果承诺。</p>
        </div>

        <div className="case-grid">
          <article className="case-card">
            <span className="case-tag">精力管理</span>
            <h3>上班族疲劳调理</h3>
            <p className="case-metric"><b>30 天</b> 模拟趋势输入</p>
            <p className="case-desc">
              系统可把睡眠、主观疲劳与活动记录汇总为周度趋势，
              并解释下一周建议由哪些输入触发。
            </p>
            <div className="case-bar"><i style={{ width: "78%" }} /></div>
            <small>精力状态 · 模拟趋势</small>
          </article>

          <article className="case-card">
            <span className="case-tag">体态矫正</span>
            <h3>圆肩驼背改善</h3>
            <p className="case-metric"><b>4 周</b> 模拟姿态对比</p>
            <p className="case-desc">
              系统可比较动作关键点与关节角变化，标记需要关注的阶段，
              但不把模拟分数包装成真实改善结果。
            </p>
            <div className="case-bar"><i style={{ width: "64%" }} /></div>
            <small>姿态指标 · 模拟趋势</small>
          </article>

          <article className="case-card">
            <span className="case-tag">膳食计划</span>
            <h3>减脂定制膳食</h3>
            <p className="case-metric"><b>12 周</b> 模拟记录摘要</p>
            <p className="case-desc">
              系统可根据记录生成结构化营养摘要，帮助用户回顾输入，
              不替代营养师或医生的个体化建议。
            </p>
            <div className="case-bar"><i style={{ width: "71%" }} /></div>
            <small>营养记录 · 模拟趋势</small>
          </article>
        </div>
      </section>
    </div>
  );
}
