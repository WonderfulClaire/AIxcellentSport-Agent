// app/agent/index.js
// Agent 层统一出口。
//
// 配置（可选）：把 LLM 接入点放在 window.__AGENT_CONFIG__，
// 这样无需改代码即可切换为 Qwen / DeepSeek / OpenAI 等 OpenAI 兼容服务：
//   window.__AGENT_CONFIG__ = {
//     baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
//     apiKey: "sk-xxx",
//     model: "qwen-plus"
//   };
// 不配置时自动使用确定性启发式（演示零依赖、零密钥、永不翻车）。

import { AgentMemory } from "./memory.js";
import { CoachAgent } from "./coachAgent.js";
import { runMultiAgent } from "./multiAgent.js";

export function loadAgentConfig() {
  if (typeof window !== "undefined" && window.__AGENT_CONFIG__) {
    return window.__AGENT_CONFIG__;
  }
  return {}; // 空 → 启发式模式
}

export { AgentMemory, CoachAgent, runMultiAgent };
export * from "./tools.js";
export * from "./multiAgent.js";
