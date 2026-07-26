# AIxcellent · AI 私人健康管家（主仓库 · 前端源码）

> **你的全方位 AI 健康管家** —— 实时姿态教练 + 视频动作分析 + 饮食营养管理 + 睡眠质量追踪 + 中医节气养生 + **云端账户同步** + **AI 周报点评**。
>
> 浏览器端运行，数据默认保存在本机（零后端也能完整演示）；登录后无缝升级为端到端云同步。

---

## 🧭 AIxcellent 系列导航

| 仓库 | 角色 | 地址 |
|------|------|------|
| **AIxcellentSport-Agent**（本仓库） | 前端主仓库（源码 / 自动部署源） | [GitHub](https://github.com/WonderfulClaire/AIxcellentSport-Agent) |
| **AIxcellentHealth-backend** | 后端：账户 / 健康档案 / 管理后台（Node + Express + Neon Postgres，Vercel 部署） | [GitHub](https://github.com/WonderfulClaire/AIxcellentHealth-backend) |
| **AIxcellentHealth-site** | 早期线上站仓库（已停用，现线上站改由本仓库 GitHub Pages 直接托管，见下方「自动部署」） | [归档站](https://wonderfulclaire.github.io/AIxcellentHealth-site/) |
| AIxcellentHealth / AIxcellentSport | 早期归档仓库（只读，已并入主仓库） | — |

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

打开本地 URL 即可使用全部功能。**无需任何 API Key 即可体验基础功能（本地演示模式）**。

```bash
npm run check   # lint + 生产构建 + 契约测试
```

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
