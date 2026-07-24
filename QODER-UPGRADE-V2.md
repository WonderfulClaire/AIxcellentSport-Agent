# AIxcellent 私享管家 · 升级任务书 v2（体验流程 + 真实能力）

> 给 Qoder 的第二轮夜间任务。**先读 `QODER-HANDOFF.md` 和 `NIGHT-REPORT.md`，再开工。**
> 上一轮（T1~T6）已完成：健康趋势面板、每周报告、移动端打磨、PWA 增强、可穿戴会话小结、工程化拆包。本轮**不要重复**这些。

---

## 0. 本轮为什么做（产品主人的原话）

> "界面挺好，但用了一下不知道功能做什么；每个细分模块建议去 GitHub 找成熟项目拼接过来，提高真实能力。"

翻译成两条主线：

- **主线 A｜体验流程**：让用户一进来就知道"这是干嘛、我该点哪、这个功能怎么用"。现在缺引导层。
- **主线 B｜真实能力**：很多模块是"规则写死/演示数据"，要接**真实数据集 / 公开算法 / 大模型**，让它有真本事。

---

## 1. 现状体检结论（已由主人核实，别推翻，直接用）

| 层 | 模块 | 状态 | 本轮怎么办 |
|---|---|---|---|
| **A 真能跑** | 体态评估、视频分析（MediaPipe 姿态）、运动库、可穿戴蓝牙、健康趋势、每周报告 | ✅ 真算法/真数据 | **别重做**，只补"怎么用"说明 |
| **B 规则引擎** | 私人营养、饮食追踪、中医养生、睡眠追踪、能量状态、训练计划/时间线/历史 | ⚠️ 能跑但偏浅 | 接**真实数据集 + 公开算法**增强 |
| **C 待激活** | AI 健康管家、助手中心、图片顾问、形象顾问 | 🔴 已埋 `callLLM` 接口，缺配置 | 打通**大模型配置**，无 Key 时优雅兜底 |

**关键架构事实（省你调研时间）：**
- `app/agent/coachAgent.ts` 里 `callLLM(messages, config, tools)` 是 **OpenAI 兼容**：需要 `config = { apiKey, baseUrl, model }`；支持 tools（function calling）。
- `app/agent/` 下已有：coachAgent / nutritionPlanner / healthConcierge / imageConsultant / tcmEngine / postureAnalyzer / videoAnalyzer / workoutPlanner / energyStateEngine / multiAgent / memory / tools。**引擎骨架都在，缺的是"真数据 + 真配置 + 引导"。**
- 用户/token 存 `localStorage`（`aix_token` / `aix_user`）；健康数据走 `app/healthStore.ts`。
- ⚠️ `public/data/foods.json` 文件头有 `//` 注释——标准 `JSON.parse` 会报错，Qoder 需核实加载方式是否已处理注释（U4 会碰到）。

---

## 2. 铁律（违反视为任务失败）

1. **只在本地 `git commit`，禁止 `git push`**（发布由主人负责，你没 push 权限也别尝试）。
2. **每个任务一个独立 commit**，信息格式 `[U1] xxx`。
3. **任何时候保证 `npm run build` 绿灯、`npm test` 通过**；改崩了要就地修好再继续。
4. 需要**真实 API Key / 真账号 / 联网真机**才能端到端验证的，**做好管道 + 兜底 + 本地 mock 自测**即可，**不要卡住**，记进报告等主人补。
5. **文案去 AI 化**：不吹"AI 驱动/智能大脑"，用"为你订制/私享管家"这类人话；保留主页现有基调。
6. **红涨绿跌**（中国习惯）、货币用 ¥。
7. **不许碰主人其它 GitHub 仓库**；本项目内随便改。
8. 全部进度写进 **`NIGHT-REPORT-V2.md`**（逐任务：做了啥/改了哪些文件/自测结果/遗留）。
9. 引入任何开源资源，**必须核对许可证**（见第 4 节），**优先 MIT / ODbL / Apache**，**避开 GPL/AGPL**（传染性，会污染整个项目）。

---

## 3. 任务队列（U1 → U7，按序自主完成）

### U1 · 全局设置页 + 大模型配置中心（C 层地基，最先做）
**目标**：一处配置，点亮所有 AI 能力。
- 新建 `app/components/Settings.tsx` + 功能中心入口"设置 / 偏好"。
- 大模型配置表单：`baseUrl`（默认占位 `https://api.deepseek.com`）、`apiKey`、`model`（默认 `deepseek-chat`），存 `localStorage` key = `aix_llm_config`（JSON）。
- 新建 `app/agent/config.ts`：`export function getLLMConfig()` 读上面的 key；`export function hasLLM()` 判断是否配齐。
- 让 `AssistantHub.tsx`、`imageConsultant`、`healthConcierge` 等**统一从 `getLLMConfig()` 读**，替换现有零散的 `cfg`。
- 设置页加"测试连接"按钮：发一条最小 `callLLM` 请求，显示成功/失败（无 Key 时提示"未配置"）。
- 其它偏好项：单位（kg/lb）、演示数据开关、清除本地数据入口（复用 healthStore）。
**验收**：填假 Key 点测试→报错友好；不填→全站 AI 模块显示"未配置，去设置填 Key"而不是崩。

### U2 · 首次引导 Onboarding（主线 A 核心）
**目标**：新用户一进来 30 秒懂产品、并完成建档。
- 新建 `app/components/Onboarding.tsx`：3~4 屏轮播——① 我们是谁（私享健康管家）② 三步：建档→设计→陪伴 ③ 隐私承诺（本地优先）④ "开始 3 分钟评估"直达建档。
- 首次访问弹出（`localStorage` 标记 `aix_onboarded`），可跳过；顶栏留"重新看引导"入口。
- 黑金风、可左右滑、移动端友好。
**验收**：清 localStorage 后首访自动弹；点完直达建档；再访不重复弹。

### U3 · 每模块"怎么用"说明条 + 空状态示例（主线 A 核心）
**目标**：消灭"不知道这功能干嘛"。
- 做一个通用组件 `app/components/ModuleIntro.tsx`（props: `title / what / how[] / tip`），放在每个功能模块顶部：一句话说明"这是什么" + 2~3 步"怎么用"，可折叠。
- 给 **全部 20 个模块**各写一段真实、具体的说明（别套话）。示例：
  - 体态评估："打开摄像头，站直正对镜头 5 秒，我用姿态识别算出你的圆肩/骨盆前倾角度。"
  - 私人营养："填身高体重目标，生成每日热量与三大营养素配比，并给出一日三餐建议。"
- **空状态引导**：模块无数据时，显示"加载示例数据体验"按钮（写入演示数据，标记来源 demo，可一键清除）。
**验收**：随便点任一模块，顶部都有"这是什么/怎么用"；空模块能一键填示例看效果。

### U4 · 营养 / 饮食接真实数据（主线 B，提升最猛）
**目标**：从"写死规则"变"真按食物算营养"。
- **先修坑**：核实 `foods.json` 带 `//` 注释的加载问题；改成合法 JSON（去注释，注释挪到单独字段或 README）。
- **扩充本地食物库**：把 `public/data/foods.json` 从现有条目扩到 **≥300 条**常见中国食物（每 100g：热量/蛋白/碳水/脂肪/纤维），数据源见第 4 节。
- 饮食追踪：支持**按名称搜索食物 + 选份量**，自动累加当日热量与营养素，对比目标给缺口提示。
- 私人营养：基于建档（身高/体重/活动量/目标）用 **Mifflin-St Jeor 公式**算 BMR/TDEE（公开算法），给出热量目标与三大营养素克数。
- **可选（联网）**：接 Open Food Facts 搜索 API 做"扫条码/搜品牌食品"，注意 CORS 与超时兜底；连不上就退回本地库，别卡。
**验收**：搜"米饭"能出数据、加进当日、看到累计营养；私人营养给出的 TDEE 数值随建档变化且合理。

### U5 · 睡眠 / 能量状态接公开算法（主线 B）
**目标**：从演示数据变真实计算。
- 睡眠追踪：录入/导入的入睡-醒来时段，估算**睡眠时长、规律性（入睡时间标准差）、周中 vs 周末差**，给可读解读。
- 能量状态：结合静息心率趋势、睡眠、HRV（若有可穿戴数据）算一个 0~100 的"恢复/能量"分（公开的简单加权模型即可，注明是参考值非医疗）。
- 全部**纯本地计算**，无需外部 API。
**验收**：喂入几天数据能算出趋势与解读；无数据时走 U3 的示例数据。

### U6 · AI 管家 / 助手 / 图片顾问打通大模型（主线 B + C）
**目标**：配了 Key 就是真对话，没配就优雅兜底。
- 让 `AssistantHub` / `HealthConcierge` / `ImageConsultant` 全部走 `getLLMConfig()` + `callLLM`。
- **注入上下文**：把用户档案 + 最近健康数据摘要放进 system prompt，让回答"懂这个人"（隐私只在本地拼装，不外发无关数据）。
- **function calling**：用 `app/agent/tools.ts` 让管家能"打开某模块 / 读某项数据"（现有 `MODULES` 意图映射已有雏形，接上 tools）。
- 图片顾问：有 Key 时走多模态（若 model 支持）分析上传图；无 Key 时退回现有规则说明。
- **无 Key 兜底**：所有入口显示"未配置大模型，去设置填 Key 即可开启真对话"，并保留现有规则回答，别报错。
- 用一个**本地 mock**（假 baseUrl 返回固定 JSON）自测管道逻辑通，真 Key 留主人明早填。
**验收**：填 Key（或 mock）→ 管家能结合我的档案回答、能被要求"打开训练计划"；不填→兜底提示，不崩。

### U7 · 工程化收尾 + 验收
- 为 U1/U4/U5 的新逻辑补 **vitest 单测**（config 读写、TDEE 计算、营养累加、睡眠规律性）。
- `npm run build` 绿灯、`npm test` 全过、构建告警清零。
- 更新 `NIGHT-REPORT-V2.md` 汇总，列清"已完成 / 需主人补 Key 或数据 / 已知限制"。

---

## 4. 可拼接的开源资源清单（核对许可证后用）

> **原则**：健康类成熟开源多是"带后端的完整 App"，塞不进本项目纯前端 SPA。**只摘它们的"数据集 / 算法"，不搬壳。**

**食物营养（U4）**
- **Open Food Facts** — 开放食品数据库，含中文，有搜索/条码 API。许可 **ODbL**（数据库开放，需署名）。✅ 可用，注意署名。
- **USDA FoodData Central** — 权威英文营养库，有 API。**公共领域**。✅ 可用。
- 本地扩库参考"中国食物成分表（标准版）"公开数值（自行录入为 JSON，不含版权文本）。

**运动库（A 层已够，可选升级）**
- **yuhonas/free-exercise-db** — ~800 动作带图 JSON，许可 **MIT**（Unlicense/公共）。✅ 可直接塞 `public/data`。
- ⚠️ **wger** exercise database 是 **AGPL**——**避开**，别引入，会污染许可。

**姿态 / 动作评分（A 层增强，可选）**
- 继续用 **MediaPipe Tasks Vision**（已集成，Apache-2.0）。
- 动作评分用**关节角度规则**（如深蹲膝角、圆肩肩角）——公开几何算法，自己实现，无许可问题。

**大模型（U6）**
- **DeepSeek**（`https://api.deepseek.com`, `deepseek-chat`）性价比高、OpenAI 兼容。
- **OpenAI** / **通义千问兼容模式** 均可，全走 `callLLM` 的 `baseUrl+apiKey+model`。
- ⚠️ 别把任何 Key 硬编码进代码或 commit，只存用户本地 `localStorage`。

---

## 5. 启动指令（主人复制这段发给 Qoder）

```
先完整读取项目里的 QODER-HANDOFF.md、NIGHT-REPORT.md、QODER-UPGRADE-V2.md，
然后严格按 QODER-UPGRADE-V2.md 的任务队列 U1→U7 依次自主完成，无人值守，不要停下来问我。
遵守第 2 节全部铁律：只本地 commit 禁止 push、每任务保证 build 绿灯与测试通过、
需要真实 API Key/账号/联网真机的做好管道+兜底+本地 mock 自测即可不要卡住、
引入开源资源先核对许可证优先 MIT/ODbL/Apache 避开 GPL/AGPL。
全部进度写进 NIGHT-REPORT-V2.md。
```

---

## 6. 明早验收清单（主人用）

- [ ] `npm run dev` 预览：首访弹 Onboarding；每个模块有"怎么用"说明 + 空状态示例
- [ ] 设置页能填大模型配置、点"测试连接"
- [ ] 饮食追踪能搜真实食物、算当日营养；私人营养 TDEE 随建档变化
- [ ] 睡眠/能量状态有真实计算与解读
- [ ] （填 Key 后）AI 管家能结合档案回答、能被指令打开模块
- [ ] `npm run build` 绿灯、`npm test` 通过、`git log` 有 U1~U7 清晰 commit
- [ ] 读 `NIGHT-REPORT-V2.md` 看遗留项
- [ ] 满意 → 告诉主 AI"上线"，由它构建部署（Qoder 无 push 权限）
