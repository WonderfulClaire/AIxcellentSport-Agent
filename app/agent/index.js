// app/agent/index.js
// Agent 层统一出口。
//
// 配置（可选）：把 LLM 接入点放在 window.__AGENT_CONFIG__。
// 支持两种写法：
//   A) OpenAI 兼容直连：
//      window.__AGENT_CONFIG__ = { baseUrl: "...", apiKey: "sk-xxx", model: "..." }
//   B) 预设厂商（推荐，避免拼错 base url）：
//      window.__AGENT_CONFIG__ = { provider: "qwen" }      // 通义千问 DashScope
//      window.__AGENT_CONFIG__ = { provider: "deepseek" }  // DeepSeek
//      window.__AGENT_CONFIG__ = { provider: "openai" }    // OpenAI
// 不配置时自动使用确定性启发式（演示零依赖、零密钥、永不翻车）。

import { AgentMemory } from "./memory.js";
import { CoachAgent } from "./coachAgent.js";
import { runMultiAgent } from "./multiAgent.js";

// 预设厂商的 OpenAI 兼容接入点（仅 base url，不含密钥）。
// 7/24 黑客松若要求 Qoder/通义千问，把 provider 设为 "qwen" 即可，无需改代码。
const PROVIDER_PRESETS = {
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  dashscope: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

export function loadAgentConfig() {
  let cfg = {};
  if (typeof window !== "undefined" && window.__AGENT_CONFIG__) {
    cfg = { ...window.__AGENT_CONFIG__ };
  }
  // 预设厂商展开为具体 base url / model
  if (cfg.provider && PROVIDER_PRESETS[cfg.provider]) {
    const p = PROVIDER_PRESETS[cfg.provider];
    cfg.baseUrl = cfg.baseUrl || p.baseUrl;
    cfg.model = cfg.model || p.model;
  }
  // 统一默认值：LLM 调用超时，超时即降级启发式（演示永不卡死）
  cfg.timeoutMs = cfg.timeoutMs || 8000;
  return cfg;
}

export { AgentMemory, CoachAgent, runMultiAgent };
export * from "./tools.js";
export * from "./multiAgent.js";
