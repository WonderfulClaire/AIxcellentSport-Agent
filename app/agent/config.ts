// app/agent/config.ts
// 统一 LLM 配置读写（localStorage 持久化）。
// 所有 AI 模块从此处获取密钥/端点，Settings 页面写入。

const LLM_CONFIG_KEY = 'aix_llm_config';

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 读取配置，未配置或不完整时返回 null */
export function getLLMConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) return null;
    return cfg;
  } catch { return null; }
}

/** 保存配置到 localStorage */
export function saveLLMConfig(cfg: LLMConfig): void {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(cfg));
}

/** 判断是否已配齐（有效 Key + 端点 + 模型） */
export function hasLLM(): boolean {
  return getLLMConfig() !== null;
}
