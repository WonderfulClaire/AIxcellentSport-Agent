# AIxcellentHealth · AI 私人健康专家

> **你的全方位 AI 健康管家** —— 实时姿态教练 + 视频动作分析 + 饮食营养管理 + 睡眠质量追踪 + 中医节气养生

AIxcellentHealth 在浏览器端运行，**所有数据不出设备**。从运动到饮食、从睡眠到养生，7 大模块覆盖健康管理的方方面面。

## ✨ 核心功能（7 大模块）

| 模块 | 功能 | 技术栈 |
|------|------|--------|
| 🎯 **实时训练** | MediaPipe 实时姿态识别，33 关键点追踪，即时纠正 | MediaPipe Tasks Vision |
| 🎬 **视频分析** | 上传健身视频 → 逐帧分析 → Gemini 级专业报告（问题诊断/改进方法/替代方案/进阶调整） | MediaPipe IMAGE 模式 + LLM |
| 📚 **动作库** | 200+ 动作数据库，中文说明，肌群映射，搜索筛选 | exercises-dataset (MIT) |
| 🥗 **饮食管理** | 中文食物营养库，卡路里/蛋白质/碳水/脂肪追踪，每日目标 | localStorage |
| 😴 **睡眠追踪** | 睡眠时长记录，质量评分(1-5)，7日趋势分析 | Web API |
| 🌿 **中医养生** | 二十四节气算法 + 天气联动 + 体质辨识问卷 + 穴位保健建议 | 纯算法 + Open-Meteo API |
| 🤖 **AI 智能体** | 多智能体编排（感知→记忆→规划→反馈），LLM 可插拔 | OpenAI 兼容协议 |

## 🚀 快速开始

```bash
git clone https://github.com/WonderfulClaire/AIxcellentSport-Agent.git
cd AIxcellentSport-Agent
npm ci
npm run dev
```

打开本地 URL 即可使用全部功能。**无需任何 API Key 即可体验基础功能**。

```bash
npm run check   # lint + 生产构建 + 产品契约测试
```

## 接入 LLM（可选，一行配置）

在浏览器控制台注入 `window.__AGENT_CONFIG__`：

```js
// 预设厂商（推荐）
window.__AGENT_CONFIG__ = { provider: "hunyuan" };  // 混元Hy3
// window.__AGENT_CONFIG__ = { provider: "qwen" };     // 通义千问
// window.__AGENT_CONFIG__ = { provider: "deepseek" };
// window.__AGENT_CONFIG__ = { provider: "openai" };

// 或直连任意 OpenAI 兼容接口
window.__AGENT_CONFIG__ = {
  baseUrl: "https://api.example.com/v1",
  apiKey: "sk-xxx",
  model: "model-name",
};
```

不配置 → 自动走确定性启发式（零依赖、零密钥）。LLM 超时自动降级。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                  AIxcellentHealth                    │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ 实时训练  │ 视频分析  │ 饮食管理  │ 睡眠追踪  │ 中医养生  │
│          │          │          │          │         │
│ MediaPipe │ IMAGE模式 │ 食物DB   │ 质量评分  │ 节气算法 │
│ VIDEO模式 │ 逐帧提取 │ 营养计算 │ 趋势分析  │ 天气API  │
│ GPU加速   │ LLM报告  │ 目标追踪 │ 建议生成  │ 体质辨识 │
├──────────┴──────────┴──────────┴──────────┴─────────┤
│              Agent 智能体层 (app/agent/)              │
│  CoachAgent → FormAnalyzer / ProgressTracker / PlanGenerator │
│  callLLM (OpenAI兼容) ← 可插拔 LLM / 启发式兜底      │
└─────────────────────────────────────────────────────┘
```

### 文件结构

```
app/
├── page.tsx              # 主页面（7 Tab 导航）
├── components/
│   ├── VideoAnalyzer.tsx # 视频上传 + 分析 UI
│   ├── DietTracker.tsx   # 饮食管理 UI
│   ├── SleepTracker.tsx  # 睡眠追踪 UI
│   ├── TCMWellness.tsx   # 中医养生 UI
│   ├── ExerciseLibrary.tsx   # 动作库
│   ├── Dashboard.tsx     # 数据面板
│   └── TrainingHistory.tsx   # 训练记录
├── agent/
│   ├── index.js          # 统一出口 + LLM 配置
│   ├── coachAgent.js     # 教练智能体编排
│   ├── multiAgent.js     # 多智能体协作
│   ├── memory.js         # 记忆持久化
│   ├── tools.js          # 工具注册表
│   ├── form.js           # 动作评估规则
│   ├── videoAnalyzer.js  # 视频分析引擎
│   └── tcmEngine.js      # 中医养生引擎
public/data/
├── exercises.json        # 200+ 动作数据
└── foods.json            # 30+ 常见食物营养数据
```

## 视频分析详解

视频分析是本产品的核心差异化功能之一（对标 Gemini 的视频健身教练）：

1. **上传视频**：支持 mp4/mov/webm，最大 200MB
2. **逐帧提取**：MediaPipe IMAGE 模式，每 6 帧采样一次，最多 120 帧
3. **关节角时序**：计算膝/肘/髋/躯干等 12 个关节角的逐帧变化
4. **问题检测**：幅度不足、左右不对称、躯干不稳定、膝盖内扣等
5. **LLM 报告**：四段式结构 —— 问题诊断 → 改进方法 → 替代方案 → 进阶调整
6. **关键帧截图**：每 10 帧截取一张带骨架叠加的图片

## 中医养生引擎

- **24 节气完整数据**：每个节气含养生原则、推荐食材、推荐运动、宜忌
- **天气联动**：通过 Open-Meteo 免费 API 获取当地天气，生成针对性建议
- **体质辨识**：5 题快速测试（气虚/阳虚/阴虚/痰湿/平和），给出食疗+穴位建议
- **地理定位**：浏览器 Geolocation API，自动获取位置（可手动输入城市）

## 测试

```bash
npm run test   # 运行 tests/agent.test.js
```

## License

MIT
