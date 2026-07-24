"use client";

import ModuleIntro from "./ModuleIntro";

import { useCallback, useEffect, useState } from "react";
import { getLLMConfig, saveLLMConfig, type LLMConfig } from "../agent/config";
import { callLLM } from "../agent/coachAgent";
import { deleteAllData } from "../healthStore";

const UNIT_KEY = "aix_unit";
const DEMO_KEY = "aix_demo_data";

const S = {
  page: {
    minHeight: "100vh",
    background: "#0B0B0D",
    padding: "2rem 1rem 6rem",
    maxWidth: 640,
    margin: "0 auto",
  } as React.CSSProperties,
  heading: {
    color: "#D4AF37",
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "1.5rem",
    letterSpacing: ".02em",
  } as React.CSSProperties,
  card: {
    background: "rgba(24,22,18,.92)",
    border: "1px solid rgba(212,175,55,.2)",
    borderRadius: 12,
    padding: "1.5rem",
    marginBottom: "1.5rem",
  } as React.CSSProperties,
  cardTitle: {
    color: "#D4AF37",
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "1rem",
  } as React.CSSProperties,
  label: {
    display: "block",
    color: "#9A9488",
    fontSize: ".8rem",
    marginBottom: 4,
    marginTop: 12,
  } as React.CSSProperties,
  input: {
    width: "100%",
    background: "rgba(12,12,14,.9)",
    border: "none",
    borderBottom: "1px solid rgba(212,175,55,.35)",
    color: "#ECE7D8",
    padding: "10px 8px",
    fontSize: ".95rem",
    borderRadius: 4,
    outline: "none",
    transition: "border-color .2s",
  } as React.CSSProperties,
  btnRow: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  btn: {
    padding: "10px 20px",
    border: "1px solid #D4AF37",
    borderRadius: 8,
    background: "transparent",
    color: "#D4AF37",
    fontWeight: 600,
    fontSize: ".9rem",
    cursor: "pointer",
    transition: "all .2s",
  } as React.CSSProperties,
  btnFill: {
    padding: "10px 20px",
    border: "1px solid #D4AF37",
    borderRadius: 8,
    background: "#D4AF37",
    color: "#0B0B0D",
    fontWeight: 600,
    fontSize: ".9rem",
    cursor: "pointer",
    transition: "all .2s",
  } as React.CSSProperties,
  status: {
    marginTop: 12,
    fontSize: ".85rem",
    padding: "8px 12px",
    borderRadius: 6,
  } as React.CSSProperties,
  toggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid rgba(212,175,55,.08)",
  } as React.CSSProperties,
  toggleLabel: {
    color: "#ECE7D8",
    fontSize: ".9rem",
  } as React.CSSProperties,
  dangerBtn: {
    padding: "10px 20px",
    border: "1px solid #c0392b",
    borderRadius: 8,
    background: "transparent",
    color: "#e74c3c",
    fontWeight: 600,
    fontSize: ".9rem",
    cursor: "pointer",
    marginTop: 16,
  } as React.CSSProperties,
  hint: {
    color: "#9A9488",
    fontSize: ".82rem",
    marginTop: 8,
    lineHeight: 1.5,
  } as React.CSSProperties,
};

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saved, setSaved] = useState(false);

  // 偏好
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    const cfg = getLLMConfig();
    if (cfg) {
      setBaseUrl(cfg.baseUrl);
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
    }
    const u = localStorage.getItem(UNIT_KEY);
    if (u === "lb") setUnit("lb");
    const d = localStorage.getItem(DEMO_KEY);
    if (d === "false") setDemo(false);
  }, []);

  const handleSave = useCallback(() => {
    const cfg: LLMConfig = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() };
    saveLLMConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [baseUrl, apiKey, model]);

  const handleTest = useCallback(async () => {
    const cfg: LLMConfig = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() };
    if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) {
      setTestStatus("fail");
      setTestMsg("请先填写完整的端点、密钥和模型名称");
      return;
    }
    setTestStatus("testing");
    setTestMsg("");
    try {
      const reply = await callLLM(
        [{ role: "user", content: "hi" }],
        { ...cfg, timeoutMs: 10000 },
        undefined,
      );
      if (reply) {
        setTestStatus("ok");
        setTestMsg("连接成功 ✓");
      } else {
        setTestStatus("fail");
        setTestMsg("连接失败：模型未返回有效内容，请检查密钥或端点");
      }
    } catch (e: any) {
      setTestStatus("fail");
      setTestMsg(`连接失败：${e?.message || "网络错误"}`);
    }
  }, [baseUrl, apiKey, model]);

  const toggleUnit = () => {
    const next = unit === "kg" ? "lb" : "kg";
    setUnit(next);
    localStorage.setItem(UNIT_KEY, next);
  };

  const toggleDemo = () => {
    const next = !demo;
    setDemo(next);
    localStorage.setItem(DEMO_KEY, String(next));
  };

  const handleClear = async () => {
    if (!confirm("确认清除所有本地健康数据？此操作不可撤销。")) return;
    await deleteAllData();
    alert("已清除全部本地数据");
  };

  return (
    <div style={S.page}>
      <ModuleIntro
        title="设置"
        what="配置智能对话、单位偏好和数据管理"
        how={["填写对话服务配置启用完整能力","选择体重单位(公斤/磅)","管理演示数据和清除选项"]}
      />
      <h1 style={S.heading}>全局设置</h1>

      {/* 大模型配置区 */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>私享管家智能对话 · 配置</h2>
        <p style={S.hint}>配置后，所有智能对话与训练反馈将接入你指定的语言模型。支持 OpenAI 兼容协议。</p>

        <label style={S.label}>端点 Base URL</label>
        <input
          style={S.input}
          placeholder="https://api.deepseek.com"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />

        <label style={S.label}>密钥 API Key</label>
        <input
          style={S.input}
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />

        <label style={S.label}>模型名称</label>
        <input
          style={S.input}
          placeholder="deepseek-chat"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <div style={S.btnRow}>
          <button style={S.btnFill} onClick={handleSave}>保存配置</button>
          <button style={S.btn} onClick={handleTest} disabled={testStatus === "testing"}>
            {testStatus === "testing" ? "测试中…" : "测试连接"}
          </button>
        </div>

        {saved && (
          <div style={{ ...S.status, color: "#27ae60", background: "rgba(39,174,96,.1)" }}>
            配置已保存 ✓
          </div>
        )}

        {testStatus === "ok" && (
          <div style={{ ...S.status, color: "#27ae60", background: "rgba(39,174,96,.1)" }}>
            {testMsg}
          </div>
        )}
        {testStatus === "fail" && (
          <div style={{ ...S.status, color: "#e74c3c", background: "rgba(231,76,60,.1)" }}>
            {testMsg}
          </div>
        )}

        {!getLLMConfig() && !saved && (
          <p style={{ ...S.hint, color: "#D4AF37", marginTop: 16 }}>
            尚未配置智能对话服务。填写以上信息并保存，即可开启全部智能能力。
          </p>
        )}
      </div>

      {/* 偏好设置区 */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>偏好设置</h2>

        <div style={S.toggle}>
          <span style={S.toggleLabel}>体重单位</span>
          <button style={S.btn} onClick={toggleUnit}>{unit === "kg" ? "公斤 (kg)" : "磅 (lb)"}</button>
        </div>

        <div style={S.toggle}>
          <span style={S.toggleLabel}>演示数据</span>
          <button style={S.btn} onClick={toggleDemo}>{demo ? "已开启" : "已关闭"}</button>
        </div>

        <button style={S.dangerBtn} onClick={handleClear}>清除本地数据</button>
        <p style={S.hint}>清除后训练记录、饮食日志、睡眠数据等将全部丢失。</p>
      </div>
    </div>
  );
}
