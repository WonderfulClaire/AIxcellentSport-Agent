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
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => {
      /* 注册失败不影响正常使用 */
    });
  });
}
