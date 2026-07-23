# AIxcellent 私享管家 · 开发交接说明书（给 Qoder / 任意 AI 编码助手）

> **如果你是 Qoder / AI 编码助手：请先完整读完这份文件，再动手。**
> 这份文档告诉你：项目是什么、代码在哪、技术栈、前后端如何对接、怎么跑怎么部署、
> 设计规范、必须遵守的硬性约束，以及一份可直接开工的「高级功能 + 体验升级」需求清单。
> 最后一节「⛔ 铁律」是不可违反的红线，务必遵守。

最后更新：2026-07-23 · 维护者：Claire（GitHub @WonderfulClaire）

---

## 0. 一分钟速览（TL;DR）

- **产品**：AIxcellent 私享管家 —— 一个黑金奢华风的 AI 健康管家网页应用（PWA），把「私人教练 + 营养师 + 医生 + 形象顾问」收进一个 App，让每个普通人也能拥有自己的健康思享管家。
- **形态**：纯前端 SPA（可安装为 PWA）+ 独立 Node 后端（账号 / 云端健康档案）。前后端**通过 REST API 解耦**，可分别开发。
- **线上地址（前端已部署）**：https://wonderfulclaire.github.io/AIxcellentHealth-site/
- **后端**：代码已写好、本地测通，但**尚未部署到公网**。前端在没有后端时自动降级为「演示模式」（数据存浏览器 localStorage）。
- **你的任务**：做更多更高级的功能、更好的用户体验（见 §9 需求清单）。
- **红线**：不要动 Claire 现有的其它 GitHub 仓库；要发布新东西就建新仓库（见 §10）。

---

## 1. 两个代码库在哪

| 角色 | 目录 | 说明 |
|---|---|---|
| **前端** | `AIxcellentSport-Agent/` | Vite + React 19 SPA。**主要工作区，大部分功能/体验在这里。** 本文件就在这个目录根部。 |
| **后端** | `AIxcellentHealth-backend/`（前端目录的**同级兄弟目录**） | Express + SQLite。账号、云端健康档案、管理后台。 |

> ⚠️ 两个目录是**兄弟关系**，都在同一个上级目录下。
> - 只做前端 → 打开 `AIxcellentSport-Agent/` 即可（前后端靠 HTTP API 通信，不共享文件，本文件 §6 已给出完整 API 契约，前端可独立开发）。
> - 要做后端 → 打开 `AIxcellentHealth-backend/`。
> - 要全栈联调 → 打开它们的**上级目录**，同时能看到两个 repo。
>
> 🔒 **隐私提醒**：上级目录里还混着 Claire 的**私人文件**（基金持仓报告 `fund_daily_*.md`、每日简报、论文、学术主页等）。如果在意隐私，**不要把整个上级目录交给云端 AI**，只打开这两个项目子目录即可。

---

## 2. 技术栈

### 前端 `AIxcellentSport-Agent/`
- **框架**：React 19 + TypeScript 5.9
- **构建**：Vite 8（`vite.config.ts`：`base: "./"` 相对路径，输出到 `spa-dist/`）
- **计算机视觉**：`@mediapipe/tasks-vision`（浏览器内实时姿态估计，视频不出设备）
- **样式**：一个大文件 `app/globals.css`（~2600 行，黑金主题，手写 CSS，非 Tailwind 运行时——虽然装了 tailwind 但主要用手写 CSS 变量）
- **数据持久化**：`app/healthStore.ts`（有后端走 API，无后端降级 localStorage）
- **PWA**：`public/manifest.webmanifest` + `public/sw.js`（Service Worker）+ 图标；`src/main.tsx` 注册 SW
- **注意**：装了 `next` / `vinext` / `wrangler` 等依赖是历史遗留，**实际线上产物是 Vite SPA（`npm run build` → `spa-dist/`）**，不要被 next 相关脚本误导。

### 后端 `AIxcellentHealth-backend/`
- **运行时**：Node ≥18，ESM（`"type":"module"`）
- **框架**：Express 4
- **数据库**：SQLite（`better-sqlite3`，同步 API，文件在 `data/aixcellent.db`）
- **鉴权**：JWT（`jsonwebtoken`）+ 密码哈希（`bcryptjs`）
- **CORS**：`cors`；配置读 `.env`（见 `.env.example`）
- **部署配置已备好**：`Dockerfile` / `render.yaml` / `railway.json` / `KOYEB-DEPLOY.md`（推荐 Koyeb 免绑卡，见 §8）

---

## 3. 目录结构速览

```
AIxcellentSport-Agent/            # 前端
├─ QODER-HANDOFF.md               # 👈 本文件
├─ README.md
├─ vite.config.ts                 # base:"./", outDir:"spa-dist"
├─ index.html                     # PWA meta / manifest / apple-touch-icon
├─ src/main.tsx                   # 入口 + Service Worker 注册
├─ public/                        # 静态资源（会原样拷进 spa-dist）
│  ├─ manifest.webmanifest
│  ├─ sw.js                       # Service Worker（缓存版本号 aix-vN）
│  ├─ icon-192.png / icon-512.png / icon-maskable-512.png / apple-touch-icon.png
│  └─ data/                       # 演示用静态数据
├─ app/
│  ├─ page.tsx                    # 主页面 + 顶栏 + 功能中心 + 移动端底部导航 + tab 路由
│  ├─ layout.tsx
│  ├─ globals.css                 # 全站黑金样式（约 2600 行）
│  ├─ healthStore.ts              # 数据层（API / localStorage 双通道）
│  ├─ api.ts                      # 后端请求封装（VITE_API_BASE）
│  ├─ agent/                      # AI 管家逻辑
│  └─ components/                 # 20 个功能组件（见 §5）
├─ docs/ARCHITECTURE.md
└─ spa-dist/                      # 构建产物（部署到 GitHub Pages 的内容）

AIxcellentHealth-backend/         # 后端
├─ src/
│  ├─ server.js                   # Express 启动 + 路由挂载 + 静态 admin
│  ├─ db.js                       # SQLite 建表（users / profiles / daily_records / wearable）
│  └─ routes/
│     ├─ auth.js                  # 注册 / 登录 / me / 注销
│     ├─ health.js                # 档案 / 记录 / 汇总 / 导出 / 可穿戴 / 同步 / 删除
│     └─ admin.js                 # 管理后台统计与用户管理
├─ public/admin.html              # 简易管理后台页面
├─ schema.sql
├─ .env.example
├─ Dockerfile / render.yaml / railway.json / KOYEB-DEPLOY.md / DEPLOY.md
└─ package.json                   # scripts: start / dev
```

---

## 4. 前端功能模块（`app/components/`，共 20 个）

页面通过 `app/page.tsx` 里的 `activeTab` 切换渲染。当前 tab 与组件对应：

| tab key | 组件 | 功能 |
|---|---|---|
| `assistant` | （page 内联）+ `app/agent/` | **AI 管家对话首页（默认页）** |
| `hub` | `AssistantHub` | 功能中心（三栏分类菜单，点卡片跳转模块） |
| `member` | `MemberHome` | 我的 / 会员中心（需登录） |
| `train` | 训练相关（page 内联组合） | 实时教练入口 |
| `video` | `VideoAnalyzer` | 视频动作分析 |
| `posture` | `PostureAssessment` | 体态评估 |
| `nutrition` | `PrivateNutrition` | 私人营养方案 |
| `diet` | `DietTracker` | 饮食追踪 |
| `sleep` | `SleepTracker` | 睡眠监控 |
| `tcm` | `TCMWellness` | 中医节气养生 |
| `energy` | `EnergyState` | 能量状态 |
| `doctor` | `HealthConcierge` | 私人医生/健康咨询 |
| `image` | `ImageConsultant` | 形象顾问 |
| `plan` | `WorkoutPlanner` | 训练计划 |
| `timeline` | `TrainingTimeline` | 训练时间轴 |
| `library` | `ExerciseLibrary` | 动作库 |
| `dashboard` | `Dashboard` | 数据面板 |
| `history` | `TrainingHistory` | 训练记录 |
| `wearable` | `WearableConnect` | **可穿戴设备**（Web Bluetooth 实时心率 + Apple Watch 快捷指令同步 + 手动/导入） |
| — | `AuthModal` | 登录/注册弹窗 |
| — | `LandingPage` / `CredibilitySections` / `TrustSections` | 落地/信任区块 |

> **数据流约定**：所有健康数据的读写都走 `app/healthStore.ts`，不要在组件里直接 `localStorage` 或直接 `fetch`。新增数据类型时先在 healthStore 加 `getXxx/saveXxx`，内部自动处理「有后端走 API、无后端降级本地」。

---

## 5. 数据层 `app/healthStore.ts`（重要约定）

- 每个数据域提供一对函数：`getXxx()` / `saveXxx(rec)`。
- 内部逻辑：若 `VITE_API_BASE` 存在 → 调后端 `/api/health/...`；调用失败或无后端 → **静默降级** localStorage（key 形如 `aix_<域>_<userId>`）。
- 已实现域：profile、records、wearable（含 Apple 健康同步归一化 `normalizeAppleHealth`，按天合并 records + workouts，自动从 `hr_samples` 推导平均/峰值心率）。
- `exportAll()`：导出全部数据（schema_version=2，含 wearable），用于「数据可携带权」。
- `deleteAllData()` / `deleteAccount()`：清本地所有 key + 调后端删除。

> 新功能若需要持久化，**遵循同样的双通道模式**，保证「没部署后端也能演示」。

---

## 6. 前后端 API 契约（让两边独立开发也能对齐）

前端通过 `app/api.ts` 请求，基址由构建期环境变量 **`VITE_API_BASE`** 决定（例如 `https://xxx.koyeb.app`）。未设置时前端走演示模式。

鉴权：登录后拿到 JWT，后续请求带 `Authorization: Bearer <token>`。

### Auth（`/api/auth`）
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/register` | `{email,password,name}` → `{token,user}` |
| POST | `/login` | `{email,password}` → `{token,user}` |
| GET | `/me` | 当前用户信息 |
| DELETE | `/me` | 注销并删除账号 |

### Health（`/api/health`，需鉴权）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/profile` | 读健康档案 |
| PUT | `/profile` | 更新档案 |
| GET | `/records` | 每日记录列表 |
| POST | `/records` | upsert 每日记录 |
| GET | `/summary` | 汇总统计 |
| GET | `/export` | 导出全部（含 profile / records / wearable） |
| GET | `/wearable` | 可穿戴记录列表 |
| POST | `/wearable` | upsert 单条可穿戴记录（`UNIQUE(user_id,date,source)`） |
| POST | `/sync` | **快捷指令同步入口**：`{schema:"aix-apple-health/v1", records:[...], workouts:[...]}`，按天聚合、workouts 自动算平均/峰值心率，来源标 `apple_health` |
| DELETE | `/data` | 清空本人全部健康数据 |

### Admin（`/api/admin`，管理端）
`/stats`、`/users`、`/users/:id`、`PUT /users/:id/status`、`DELETE /users/:id`。配套页面 `public/admin.html`。

### DB 表（`src/db.js`）
- `users(id, email, password_hash, name, status, created_at)`
- `profiles(user_id, ...)`
- `daily_records(user_id, date, ...)`，`UNIQUE(user_id,date)`
- `wearable(user_id, date, source, device, resting_hr, avg_hr, max_hr, steps, sleep_hours, spo2, hrv, active_energy, note, created_at)`，`UNIQUE(user_id,date,source)`

---

## 7. 本地怎么跑

### 前端
```bash
cd AIxcellentSport-Agent
npm install
npm run dev            # 本地开发 (Vite)
npm run build          # 产出 spa-dist/（用于部署）
npm run start          # 预览构建产物 (vite preview, :3000)
# 连后端联调：先 export VITE_API_BASE=http://localhost:8787 再 npm run dev
```

### 后端
```bash
cd AIxcellentHealth-backend
npm install
cp .env.example .env   # 配 JWT_SECRET / PORT / CORS_ORIGIN 等
PORT=8787 npm run start # 或 npm run dev（--watch 热重载）
# 健康检查：GET http://localhost:8787/api/health
```

---

## 8. 怎么部署

### 前端 → GitHub Pages（当前方式）
- 目标仓库：`WonderfulClaire/AIxcellentHealth-site`，Pages 从 **main 分支根目录**提供服务。
- 流程：`npm run build` → 把 `spa-dist/` 内容推到 `AIxcellentHealth-site` 的 main 根目录。
- 沙箱环境里 `git push` 走 github.com 隧道会被代理挡（502），**改用 `gh api -X PUT /repos/.../contents/<path>`（base64）逐文件推**；或写 Python 脚本批量 PUT。
- 每次部署记得**清理旧的 hash 资源**（`assets/index-*.js/css`），避免残留；改完可用 `gh api -X POST repos/.../pages/builds` 手动触发构建。
- 坑：Pages 构建有队列延迟；构建中 CDN 可能缓存 404，用 `?v=N` 缓存穿透复验即可。

### 后端 → 尚未部署（推荐 Koyeb）
- 结论：2026 年多数免费后端要绑卡；**Koyeb 免费档不绑卡**（512MB / 1 服务 / 免费 Postgres）。
- 步骤见 `AIxcellentHealth-backend/KOYEB-DEPLOY.md`：用 GitHub 登录 app.koyeb.com → Deploy（Dockerfile 已备好）→ 拿到公网地址。
- 部署后：给前端设 `VITE_API_BASE=<koyeb地址>` 重新 build 部署，即从「演示模式」切到「云端账号 + 多设备联动」。
- 注意 SQLite 在无持久盘的平台会丢数据；如需持久化，考虑挂卷或换 Postgres（后端已给 `render.yaml` 参考）。

---

## 9. 🚀 需求清单：更高级的功能 + 更好的体验（可直接开工）

> 按优先级排。**先做 P0 打地基，再做 P1 体验，再挑 P2 亮点。** 每做完一项跑 `npm run build` 确认不报错。

### P0 · 打好地基（让产品「真的能用」）
1. **部署后端到 Koyeb** 并把前端接上（`VITE_API_BASE`），实现真正的云端账号 + 多设备数据联动（当前是演示模式）。
2. **AI 管家真正接入大模型**：现在管家对话可能是规则/占位。接一个 LLM（流式输出 + function calling），让「我今天很累 / 帮我安排训练 / 分析我的心率」能真正调用各模块数据并给个性化建议。把 key 放环境变量，别硬编码。
3. **账号体系完善**：邮箱格式/密码强度校验、错误提示、登录态持久化、找回密码占位、注销二次确认。

### P1 · 体验升级（让产品「高级、顺手」）
4. **数据面板（Dashboard）视觉升级**：用**金色单色系**图表（深底、金线，遵守红涨绿跌不适用此处——这是健康数据不是股票），做趋势折线 / 环形评分 / 周对比；一屏一主题、大留白。
5. **AI 健康周报**：每周自动汇总（训练、睡眠、心率、饮食）生成一张「私人管家报告」卡片，可导出为图片/PDF。
6. **移动端打磨**：底部导航态、手势、加载骨架屏、空状态插画、错误兜底；确保 iPhone Safari 也顺滑。
7. **PWA 完善**：离线可用范围、每日问候的**本地推送/通知**（「下午好，今天想好好照顾自己吗」）、安装引导优化。
8. **微交互与动效**：遵循设计需求书——缓慢优雅淡入、金色微光流动、玻璃拟态；避免弹跳/花哨。

### P2 · 亮点功能（让产品「有记忆点」）
9. **可穿戴增强**：Web Bluetooth 支持更多设备与指标、后台会话记录、导入 Apple Health 全量 XML（不止快捷指令 JSON）。
10. **实时教练升级**：MediaPipe 支持更多动作的评分与计数（深蹲/俯卧撑/平板支撑…），实时语音提示。
11. **语音管家**：语音输入 + TTS 播报，做「管家在身边」的感觉。
12. **形象顾问 / 中医养生**：问卷式引导 → 生成专属方案卡（穿搭色板 / 节气食疗），像递到手上的私人报告。

### P3 · 工程化（让产品「可维护、可上线」）
13. **性能**：当前主 bundle 约 600KB，做路由级懒加载 / 代码分割 / 按需加载 MediaPipe。
14. **安全**：后端加 rate limit、JWT 过期与刷新、输入校验、CORS 收紧、CSP。
15. **测试与 CI**：关键数据层与 API 加测试；GitHub Actions 自动 build + 测试 + 部署 Pages。
16. **可访问性 & 国际化**：a11y（对比度/键盘/aria）、预留 i18n。

---

## 10. ⛔ 铁律（不可违反）

1. **不要碰 Claire 现有的其它 GitHub 仓库**：不要往任何现有 repo 的 main 直接 push、不要用 API 改现有仓库文件。要发布/实验一律**新建独立仓库**。唯一例外：前端部署到既定的 `AIxcellentHealth-site`（这是本项目的发布仓库，允许）。做别的新东西 → 新建 repo。
2. **文案「去 AI 化 / 去廉价感」**：不要用「而非一堆功能」这类表述。品牌调性是「高端健康思享管家，让每个普通人也用上」。标语参考：「让每个人都拥有自己的健康思享管家」「专为你一人订制」。
3. **股票/涨跌类可视化**（若涉及）：中国习惯 **红涨绿跌**，货币用 ¥。（注意：健康数据图表不适用此规则，用金色单色系。）
4. **诚实对待平台限制**：网页无法直连 Apple Watch 实时数据（苹果封死 iOS Safari 蓝牙 + 健康数据）。不要假装能做到；Apple 侧走「iOS 快捷指令 → 健康 App 取数 → 导入/同步」的桥接方案（已实现）。
5. **保持「无后端也能演示」**：新功能若需持久化，遵循 healthStore 双通道模式（API 失败降级 localStorage），别让没部署后端就白屏。
6. **改完必须 `npm run build` 验证**通过再算完成；TypeScript 报错要清零。
7. **不要删 `.workbuddy` 目录**（项目数据，非缓存）。

---

## 11. 验收自测清单（每个改动后过一遍）

- [ ] `cd AIxcellentSport-Agent && npm run build` 成功，无 TS/构建错误
- [ ] `spa-dist/` 含 `index.html` + `manifest.webmanifest` + `sw.js` + 图标 + `assets/*`
- [ ] 本地 `npm run start` 预览，主要 tab 都能打开、不白屏
- [ ] 无后端时数据能存本地、刷新还在（演示模式 OK）
- [ ] 若改后端：`PORT=8787 npm run start` 起得来，`/api/auth/register`→`/api/health/sync`→`/api/health/wearable` 端到端通
- [ ] 移动端（窄屏）布局正常，底部导航可用
- [ ] 视觉符合黑金规范（近黑底 #0B0B0D、暖白字 #ECE7D8、金 #D4AF37 克制使用）

---

## 12. 关键文件索引（快速定位）

- 设计规范全文：`../AIxcellentHealth-设计需求书.md`（黑金风、信息架构、组件规范、Prompt 模板）
- 前端入口：`src/main.tsx` → `app/page.tsx`
- 全站样式：`app/globals.css`
- 数据层：`app/healthStore.ts` / `app/api.ts`
- 可穿戴/Apple 同步：`app/components/WearableConnect.tsx`
- 后端路由：`../AIxcellentHealth-backend/src/routes/{auth,health,admin}.js`
- 后端建表：`../AIxcellentHealth-backend/src/db.js`
- 后端部署指引：`../AIxcellentHealth-backend/KOYEB-DEPLOY.md`

---

**开工建议**：先读 §6 API 契约 + §4 组件表建立全局认知 → 从 §9 的 P0-1（部署后端）或 P0-2（AI 管家接大模型）挑一个开始 → 每步 build 验证 → 遵守 §10 铁律。祝顺利。
