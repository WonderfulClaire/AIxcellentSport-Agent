import { describe, it, expect, beforeEach } from "vitest";
import { getLLMConfig, saveLLMConfig, hasLLM } from "./config";

describe("config 读写", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getLLMConfig() 无配置时返回 null", () => {
    expect(getLLMConfig()).toBeNull();
  });

  it("saveLLMConfig() 保存后 getLLMConfig() 能正确读取", () => {
    const cfg = { baseUrl: "https://api.deepseek.com", apiKey: "sk-test-123", model: "deepseek-chat" };
    saveLLMConfig(cfg);
    const result = getLLMConfig();
    expect(result).toEqual(cfg);
  });

  it("hasLLM() 无配置时返回 false", () => {
    expect(hasLLM()).toBe(false);
  });

  it("hasLLM() 有完整配置时返回 true", () => {
    saveLLMConfig({ baseUrl: "https://api.deepseek.com", apiKey: "sk-abc", model: "deepseek-chat" });
    expect(hasLLM()).toBe(true);
  });

  it("缺字段（如无 apiKey）时 getLLMConfig() 返回 null", () => {
    // 手动写入缺少 apiKey 的配置
    localStorage.setItem("aix_llm_config", JSON.stringify({ baseUrl: "https://api.deepseek.com", model: "deepseek-chat" }));
    expect(getLLMConfig()).toBeNull();
  });

  it("缺 baseUrl 时 getLLMConfig() 返回 null", () => {
    localStorage.setItem("aix_llm_config", JSON.stringify({ apiKey: "sk-123", model: "deepseek-chat" }));
    expect(getLLMConfig()).toBeNull();
  });

  it("缺 model 时 getLLMConfig() 返回 null", () => {
    localStorage.setItem("aix_llm_config", JSON.stringify({ baseUrl: "https://api.deepseek.com", apiKey: "sk-123" }));
    expect(getLLMConfig()).toBeNull();
  });

  it("localStorage 含非法 JSON 时 getLLMConfig() 返回 null", () => {
    localStorage.setItem("aix_llm_config", "not-json-{{{");
    expect(getLLMConfig()).toBeNull();
  });
});
