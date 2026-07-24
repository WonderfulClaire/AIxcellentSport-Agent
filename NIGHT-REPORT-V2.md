# 🌙 夜间自动开发报告 V2（升级轮）

## U1. 全局设置页 + 大模型配置中心 ✅

**做了什么**：
- 新建 `app/agent/config.ts`：getLLMConfig()/saveLLMConfig()/hasLLM() 统一配置读写
- 新建 `app/components/Settings.tsx`：大模型配置表单 + 测试连接 + 偏好设置(单位/演示数据/清除数据)
- page.tsx 注册 "settings" tab + 菜单入口
- AI 模块(AssistantHub等)统一从 getLLMConfig() 读取，无 Key 时显示友好兜底提示

**改了哪些文件**：
- `app/agent/config.ts`（新建）
- `app/components/Settings.tsx`（新建）
- `app/page.tsx`（新增 tab）
- `app/components/AssistantHub.tsx`（统一 config 读取 + 兜底）
- `app/agent/index.ts`（loadAgentConfig 优先读 localStorage）

**自测结果**：
- `npm run build` 构建通过 ✅
- `npm test` 测试通过 ✅

**遗留问题**：
- 真实大模型连接需主人填入有效 API Key 验证
