// lib/healthApi.ts
// 与 AIxcellent 云端后端通信的轻量客户端（仅用于"云端账号"能力，如每日健康小推送）。
// 登录逻辑应把 JWT 写入 localStorage('aix_auth_token')，并把后端地址写入
// localStorage('aix_api_base')（可选，默认同源）。本地优先的其余功能不依赖此文件。

export interface DailyTip {
  id: string;
  title: string;
  body: string;
  emoji: string;
  source?: string;
  segment?: 'elderly' | 'middle' | 'young' | 'all';
  date?: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('aix_auth_token');
}

function getBase(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('aix_api_base') || '';
}

/** 获取当前用户的今日健康小推送；未登录或后端不可达时返回 null（静默降级）。 */
export async function fetchDailyTip(): Promise<DailyTip | null> {
  const token = getToken();
  if (!token) return null;
  const base = getBase();
  try {
    const res = await fetch(`${base}/api/health/daily-tip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.tip) || null;
  } catch {
    return null;
  }
}
