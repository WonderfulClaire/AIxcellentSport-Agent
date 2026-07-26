// lib/healthApi.ts
// 与 AIxcellent 云端后端通信的轻量客户端（云端账号能力：注册 / 登录 / 每日健康小推送）。
// - JWT 存于 localStorage('aix_auth_token')；后端地址存于 localStorage('aix_api_base')
//   （可选，默认指向下方 DEFAULT_API_BASE 的线上后端）。
// - 本地优先的其余功能不依赖此文件；未登录时相关卡片静默降级。

/** 线上后端默认地址（Vercel Serverless + Neon Postgres）。可用 localStorage('aix_api_base') 覆盖。 */
export const DEFAULT_API_BASE = "https://aixcellent-backend.vercel.app";

const TOKEN_KEY = "aix_auth_token";
const BASE_KEY = "aix_api_base";
const USER_KEY = "aix_auth_user";

/** 登录态变化事件：组件可监听后重新拉取数据（如 DailyTipCard）。 */
export const AUTH_EVENT = "aix-auth-changed";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
  status?: string;
}

export interface DailyTip {
  id: string;
  title: string;
  body: string;
  emoji: string;
  source?: string;
  segment?: "elderly" | "middle" | "young" | "all";
  date?: string;
}

function emitAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getBase(): string {
  if (typeof window === "undefined") return DEFAULT_API_BASE;
  return (window.localStorage.getItem(BASE_KEY) || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function persistSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChanged();
}

/** 退出登录：清除本地令牌与用户信息。 */
export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  emitAuthChanged();
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return (data && (data.error || data.message)) || `请求失败（${res.status}）`;
  } catch {
    return `请求失败（${res.status}）`;
  }
}

/** 登录：成功后写入本地会话并广播 AUTH_EVENT。 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${getBase()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  persistSession(data.token, data.user);
  return data.user as AuthUser;
}

/** 注册：成功后写入本地会话并广播 AUTH_EVENT。 */
export async function register(email: string, password: string, name?: string): Promise<AuthUser> {
  const res = await fetch(`${getBase()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  persistSession(data.token, data.user);
  return data.user as AuthUser;
}

/** 校验当前令牌并返回用户信息；令牌失效时自动登出并返回 null。 */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${getBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 404) {
      logout();
      return null;
    }
    if (!res.ok) return getUser();
    const data = await res.json();
    if (typeof window !== "undefined" && data?.user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return (data && data.user) || null;
  } catch {
    return getUser();
  }
}

/** 获取当前用户的今日健康小推送；未登录或后端不可达时返回 null（静默降级）。 */
export async function fetchDailyTip(): Promise<DailyTip | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${getBase()}/api/health/daily-tip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.tip) || null;
  } catch {
    return null;
  }
}
