import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Home />
    </React.StrictMode>
  );
}

// 注册 Service Worker（PWA：可安装到主屏幕 + 离线可用）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = (import.meta as any).env?.BASE_URL || "./";
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .then((registration) => {
        // 监听 SW 更新
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.onstatechange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // 非首次安装，说明有新版本可用
              showUpdateBar();
            }
          };
        };
      })
      .catch(() => {
        /* 注册失败不影响正常使用 */
      });
  });
}

/** 显示「发现新版本」更新提示条 */
function showUpdateBar() {
  if (document.getElementById("sw-update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "sw-update-bar";
  bar.setAttribute(
    "style",
    [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:9999",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "gap:12px",
      "padding:12px 16px",
      "background:rgba(212,175,55,.95)",
      "color:#0B0B0D",
      "font-size:14px",
      "font-weight:500",
      "font-family:-apple-system,BlinkMacSystemFont,'SF Pro',sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.3)",
    ].join(";")
  );
  bar.innerHTML = `
    <span>\u2728 \u53d1\u73b0\u65b0\u7248\u672c\uff0c\u5237\u65b0\u5373\u53ef\u4f53\u9a8c</span>
    <button id="sw-update-btn" style="
      padding:6px 16px;
      background:#0B0B0D;
      color:#D4AF37;
      border:none;
      border-radius:6px;
      font-size:13px;
      font-weight:600;
      cursor:pointer;
    ">\u7acb\u5373\u5237\u65b0</button>
  `;
  document.body.prepend(bar);
  document.getElementById("sw-update-btn")?.addEventListener("click", () => {
    window.location.reload();
  });
}
