// 轻量 API 客户端：带登录态 token，支持从环境变量读取后端地址。
// 若未配置 VITE_API_BASE，则视为「本地演示模式」，由 healthStore 降级到浏览器本地存储。

export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export function getToken(): string {
  return localStorage.getItem("aix_token") || "";
}

export function getStoredUser(): any {
  try {
    return JSON.parse(localStorage.getItem("aix_user") || "null");
  } catch {
    return null;
  }
}

export function setSession(token: string, user: any) {
  localStorage.setItem("aix_token", token);
  localStorage.setItem("aix_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("aix_token");
  localStorage.removeItem("aix_user");
}

export async function apiFetch(
  path: string,
  opts: { method?: string; body?: any } = {}
) {
  if (!API_BASE) throw new Error("NO_BACKEND");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const e = await res.json();
      if (e.error) msg = e.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}
