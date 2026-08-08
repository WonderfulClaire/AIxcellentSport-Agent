# AIxcellent Motion Coach · 浏览器端动作教练

> **摄像头姿态识别 → 可解释动作指标 → CoachAgent 个性化反馈。**
>
> 核心体验完全在浏览器运行，无需账号或 API Key。原始摄像头帧默认不上传、不持久化；
> 结构化训练与健康记录默认保存在本机，可选接入自托管后端与 OpenAI-compatible LLM。

[**在线体验**](https://wonderfulclaire.github.io/AIxcellentSport-Agent/) ·
[架构说明](docs/ARCHITECTURE.md) ·
[本地运行](#-快速开始) ·
[隐私与能力边界](#-隐私与能力边界)

---

## 🎯 核心闭环

1. MediaPipe 在浏览器端提取 33 个姿态关键点；
2. 运动规则把关键点转成角度、阶段、次数与问题标签；
3. `CoachAgent` 执行“评估 → 记忆 → 计划 → 反馈”；
4. 没有 LLM Key 时使用确定性规则，公开 Demo 不会因外部服务不可用而失效；
5. 只有配置 LLM 后，结构化文字指标才会发送到所选模型服务，原始视频帧不进入该请求。

当前实时训练支持深蹲、俯卧撑和开合跳。Apple Health 导入、睡眠、营养和周报属于围绕训练闭环的扩展模块，不代表医疗诊断或临床验证。

---

## 🧭 仓库关系

| 仓库 | 角色 | 地址 |
|------|------|------|
| **AIxcellentSport-Agent**（本仓库） | 前端主仓库（源码 / 自动部署源） | [GitHub](https://github.com/WonderfulClaire/AIxcellentSport-Agent) |
| **AIxcellentHealth-backend** | 后端：账户 / 健康档案 / 管理后台（Node + Express + Neon Postgres，Vercel 部署） | [GitHub](https://github.com/WonderfulClaire/AIxcellentHealth-backend) |
| **AIxcellentHealth-site** | 旧部署镜像，已归档，不再作为入口 | [归档仓库](https://github.com/WonderfulClaire/AIxcellentHealth-site) |
| AIxcellentHealth / AIxcellentSport | 早期版本，已归档并由本仓库取代 | — |

---

## ✨ 核心功能

| 模块 | 功能 | 数据走向 |
|------|------|----------|
| 🎯 实时训练 | MediaPipe 实时姿态识别，33 关键点即时纠正 | 本地 |
| 🎬 视频分析 | 上传视频 → 逐帧分析 → 专业报告 | 本地 + 可选 LLM |
| 📚 动作库 | 200+ 动作数据库，肌群映射，搜索筛选 | 本地 |
| 🥗 饮食管理 | 中文食物营养库 + 拍照识别，热量/宏量追踪 | 本地 / **云端** |
| 😴 睡眠追踪 | 睡眠时长记录，质量评分，趋势分析 | 本地 / **云端** |
| 🌿 中医养生 | 二十四节气 + 天气联动 + 体质辨识 | 本地 |
| 🤖 AI 智能体 | 多智能体编排，LLM 可插拔 | 本地 + 可选 LLM |
| ☁️ 云账户同步 | 注册即建私人档案，数据跨设备加密同步 | **云端（Neon Postgres）** |
| 📊 AI 周报点评 | 聚合近 30 天数据，LLM 生成「本周发现 + 下周建议」 | **云端（可选 LLM）** |

---

## 🚀 快速开始

```bash
git clone https://github.com/WonderfulClaire/AIxcellentSport-Agent.git
cd AIxcellentSport-Agent
npm ci
npm run dev
```

打开本地 URL 即可体验核心动作教练与本地演示模式，**无需账号或 API Key**。

```bash
npm run check   # lint + 生产构建 + 契约测试
```

---

## 🔐 隐私与能力边界

| 模式 | 默认数据路径 | 说明 |
|---|---|---|
| 本地演示 | 摄像头推理与结构化记录留在浏览器 | 默认模式；原始视频帧不上传、不持久化 |
| 可选 LLM | 结构化文字指标发送到用户配置的模型服务 | 不发送原始视频帧；数据政策取决于所选服务商 |
| 可选云同步 | 结构化档案与记录发送到 `VITE_API_BASE` | 仅在部署并配置后端后启用；传输使用 HTTPS |

这是教育与运动反馈原型，不是医疗器械，也不提供疾病诊断、处方或治疗方案。生产部署前仍需独立完成身份认证、密钥管理、静态加密、日志脱敏、数据保留策略及适用地区的合规评估。

---

## ☁️ 启用云同步（可选）

默认是「本地演示模式」：数据存在浏览器本地。要跨设备同步，需接入后端：

1. 部署后端：将 [`AIxcellentHealth-backend`](https://github.com/WonderfulClaire/AIxcellentHealth-backend) 部署到 Vercel / Railway / Render（仓库内含 `vercel.json` / `railway.json` / `render.yaml`）。
2. 前端构建时注入后端地址：

```bash
# 构建前端（VITE_API_BASE 指向你的后端 URL）
VITE_API_BASE=https://your-backend.vercel.app npm run build
```

3. 打开站点 → 右上角「登录 / 注册」→ 建档后，饮食 / 睡眠 / 可穿戴 / 周报数据自动在云端加密同步，多设备共享同一档案。
4. 数据可随时「导出 / 删除」（个保法可携带权与删除权）。

---

## 🤖 AI 周报点评（可选）

后端 `/api/health/insight` 聚合本人近 30 天数据生成点评。**配置大模型 key 后体验最佳，未配置则自动降级为规则引擎**（始终可用）：

```bash
# AIxcellentHealth-backend/.env
OPENAI_API_KEY=sk-xxx        # 或二选一：
GROQ_API_KEY=gsk_xxx         # Groq 免费额度即可，延迟更低
```

前端「每周报告」页在登录云端后会展示 AI 生成的点评卡片（本周发现 / 下周建议 + 来源标注）。

---

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────────┐
│                  AIxcellent（前端 SPA）                     │
│  实时训练 · 视频分析 · 饮食 · 睡眠 · 中医 · 智能体 · 周报    │
├──────────────────────────┬───────────────────────────────┤
│  healthStore（数据中枢）   │  本地模式：localStorage         │
│  login/register/getX/...  │  云端模式：fetch → 后端 API     │
└──────────────┬───────────┴───────────────┬───────────────┘
               │  VITE_API_BASE（构建期注入） │
               ▼                              ▼
        ┌──────────────────────────────────────────┐
        │  AIxcellentHealth-backend (Express)        │
        │  /auth 登录注册 · /health 档案/记录/同步    │
        │  /insight AI 点评 · /admin 管理后台         │
        │  数据层：Neon Postgres（Vercel Serverless） │
        └──────────────────────────────────────────┘
```

---

## 🤖 自动部署（CI）

本仓库 push `main` 即触发 GitHub Actions：

1. `ci.yml`：安装依赖 → 审计 → lint（warning 级，不阻断）→ 运行测试（真正质量门禁）。
2. `deploy.yml`：构建 `spa-dist` → 用内置 `GITHUB_TOKEN` 发布到**本仓库**的 `gh-pages` 分支（GitHub Pages 线上站）。
   - **零 secret**：无需 PAT / Deploy Key / DEPLOY_TOKEN，开箱即用。
   - **每次部署只产生 1 个干净提交**（`force_orphan`），告别手动噪音提交。
   - 线上站地址：`https://wonderfulclaire.github.io/AIxcellentSport-Agent/`
   - 首次部署后，请到仓库 `Settings → Pages` 确认 Source 为 **Deploy from a branch → `gh-pages`**（通常首次运行会自动开启）。
   - `VITE_API_BASE`（可选 secret）：后端地址，填入后线上站自动启用云同步。

---

## 📄 License

MIT
