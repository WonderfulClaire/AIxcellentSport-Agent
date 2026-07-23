# AIxcellentSport · 黑客松参赛说明（阿里云 Qoder 智能体黑客松）

> 一句话：**一个完全跑在浏览器里、隐私优先、且具备记忆/规划/工具调用/多智能体编排的"动作教练智能体"**。它不是"检测动作"，而是"理解你、记住你、陪你练好你"。

## 1. 它为什么是"智能体"（而非普通 Web 应用）

| 智能体能力 | 本项目落地 | 代码位置 |
|---|---|---|
| **自主规划 (Planning)** | 每完成一次动作，教练智能体依据历史决定本次重点（反复出现的问题 → 升级为重点纠正项） | `coachAgent.js` |
| **记忆 (Memory)** | `AgentMemory` 在本地长期记住你的动作质量、重复问题、目标，跨动作/跨会话追踪进度 | `memory.js` |
| **工具调用 (Tool use)** | 智能体调用 `assess_form` / `log_rep` / `get_recurring_issues` / `set_goal` 等工具，LLM 也可走 function-calling | `tools.js` |
| **多智能体 (Multi-agent)** | `FormAnalyzer` + `ProgressTracker` + `PlanGenerator` 三个专注子智能体由 CoachAgent 统一编排 | `multiAgent.js` |
| **可解释 & 隐私优先** | 记忆里只存结构化指标文本，绝不上传视频帧；LLM（若启用）只接收文本 | 全局约定 |

## 2. 对评审维度的映射（典型智能体黑客松口径）

- **Agentic 创新 (≈30%)**：把"姿态检测"升级为"教练智能体"——状态化记忆 + 规划循环 + 多智能体协作，而非一次性规则脚本。
- **技术实现 (≈30%)**：纯前端端侧推理（MediaPipe WASM）+ 可插拔 OpenAI 兼容 LLM + 确定性兜底；`app/agent/` 有独立单元测试（`node --test tests/agent.test.js`）。
- **商业/社会价值 (≈25%)**：居家健身、康复辅助、体育教学等场景；隐私端侧 AI 是明确趋势，契合"端云协同"叙事。
- **Demo 演示 (≈15%)**：打开摄像头即可实时看到"骨架 + 评分 + Agent 自适应反馈 + 重点项"，**无需任何密钥/账号即可演示**（启发式兜底）。

## 3. 本地运行 & 演示脚本

```bash
npm ci
npm run dev          # 打开本地地址，允许摄像头，选择动作开练
npm run check        # lint + 构建 + 测试（含 agent 测试）
node --test tests/agent.test.js   # 单独验证 Agent 逻辑（无需摄像头/密钥）
```

**演示动线（建议 2 分钟）**：
1. 打开页面 → 点"开启实时教练" → 摄像头识别骨架与实时评分。
2. 做几个深蹲（故意膝盖内扣）→ 右侧 `AI COACH` 实时提醒。
3. 连续几次后，"🤖 Agent 重点：膝盖内扣(valgus)"出现——展示**记忆驱动的自适应**。
4. 切到俯卧撑/开合跳，展示多动作通用。

## 4. 接入 Qoder / 通义千问（可选，演示升级）

智能体层与具体 LLM 解耦。只需在页面注入一个 OpenAI 兼容配置即可切换为云端大模型：

```html
<script>
  window.__AGENT_CONFIG__ = {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", // 通义千问兼容端点
    apiKey: "sk-xxx",
    model: "qwen-plus"
  };
</script>
```

无需改任何业务代码。未配置时自动走确定性启发式，保证演示零依赖。

## 5. 答辩要点（评委可能问的）

- **Q：为什么不用纯 LLM 直接给建议？**
  A：实时性 + 隐私。端侧先做确定性感知（<50ms），智能体层做"记忆与规划"，LLM 只负责自然语言打磨；且任何一环缺失都不影响主流程（兜底设计）。
- **Q：多智能体是不是过度设计？**
  A：三个子智能体职责单一、可独立替换/复用/部署到 Qoder，便于评分、可解释、也方便后续把 PlanGenerator 接到训练计划生成服务。
- **Q：记忆存在哪？隐私如何保证？**
  A：默认存浏览器 localStorage，仅结构化指标；视频帧绝不离开设备。

## 6. 后续可扩展（赛后 / 加分项）

- 把 `PlanGenerator` 接 Qoder 工作流，生成跨天训练计划并写回记忆。
- 增加 `Calibration` 子智能体做个性化基线；增加更多动作 profile。
- 服务端 KV 记忆（通过 `AgentMemory` 的可插拔 store）实现跨设备。
