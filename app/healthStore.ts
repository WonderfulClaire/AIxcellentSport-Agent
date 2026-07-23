// 健康数据中心：后端优先，未配置后端时降级为浏览器本地存储（本地演示模式）。
// 这样无论是否部署后端，产品都能完整演示，且「数据可导出 / 可删除」始终成立。

import { API_BASE, apiFetch, getStoredUser } from "./api";

const LOCAL_UID = "local-demo";

function uid(): string {
  const u = getStoredUser();
  if (u && (u.id || u.sub)) return String(u.id || u.sub);
  return LOCAL_UID;
}
function lsKey(k: string): string {
  return `aix_${k}_${uid()}`;
}

/* ── 账户 ── */
export async function login(email: string, password: string) {
  if (API_BASE) {
    const r = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
    return r;
  }
  const user = { id: LOCAL_UID, email, name: email.split("@")[0] || "会员", role: "user", local: true };
  return { token: "local", user };
}

export async function register(email: string, password: string, name: string) {
  if (API_BASE) {
    const r = await apiFetch("/api/auth/register", { method: "POST", body: { email, password, name } });
    return r;
  }
  const user = { id: LOCAL_UID, email, name: name || email.split("@")[0] || "会员", role: "user", local: true };
  return { token: "local", user };
}

export async function fetchMe() {
  if (API_BASE) return apiFetch("/api/auth/me");
  return { user: getStoredUser() };
}

/* ── 建档 / 档案 ── */
export async function getProfile(): Promise<any> {
  if (API_BASE) {
    const r = await apiFetch("/api/health/profile");
    return r.profile;
  }
  try {
    return JSON.parse(localStorage.getItem(lsKey("profile")) || "null");
  } catch {
    return null;
  }
}

export async function saveProfile(p: any): Promise<any> {
  if (API_BASE) {
    const r = await apiFetch("/api/health/profile", { method: "PUT", body: p });
    return r.profile;
  }
  localStorage.setItem(lsKey("profile"), JSON.stringify(p));
  return p;
}

/* ── 每日记录 ── */
export async function getRecords(): Promise<any[]> {
  if (API_BASE) {
    const r = await apiFetch("/api/health/records");
    return r.records;
  }
  try {
    return JSON.parse(localStorage.getItem(lsKey("records")) || "[]");
  } catch {
    return [];
  }
}

export async function saveRecord(rec: any): Promise<any> {
  if (API_BASE) {
    const r = await apiFetch("/api/health/records", { method: "POST", body: rec });
    return r.record;
  }
  const list: any[] = await getRecords();
  const i = list.findIndex((x) => x.date === rec.date);
  const merged = { ...(i >= 0 ? list[i] : {}), ...rec };
  if (i >= 0) list[i] = merged;
  else list.unshift(merged);
  localStorage.setItem(lsKey("records"), JSON.stringify(list));
  return merged;
}

/* ── 今日状态聚合 ── */
export async function getSummary(): Promise<{ latest: any; avg: any }> {
  if (API_BASE) return apiFetch("/api/health/summary");
  const list = await getRecords();
  const latest = list[0] || null;
  const avg =
    list.length > 0
      ? {
          avg_sleep: list.reduce((a, x) => a + (x.sleep_hours || 0), 0) / list.length,
          avg_load: list.reduce((a, x) => a + (x.training_load || 0), 0) / list.length,
          avg_posture: list.reduce((a, x) => a + (x.posture_score || 0), 0) / list.length,
          cnt: list.length,
        }
      : null;
  return { latest, avg };
}

/* ── 可穿戴数据（手表/手环）──
 * 每条 = 一天的可穿戴汇总：静息心率 / 平均·最高心率 / 步数 / 睡眠 / 血氧 / HRV。
 * 来源 source: "ble"(网页蓝牙实时) | "manual"(手动录入) | "import"(导入)。
 * 当前默认演示模式存 localStorage；后端加对应接口后可无缝切换云端联动。 */
export async function getWearable(): Promise<any[]> {
  if (API_BASE) {
    try {
      const r = await apiFetch("/api/health/wearable");
      return r.wearable || [];
    } catch {
      /* 后端暂无该接口时静默降级 */
    }
  }
  try {
    return JSON.parse(localStorage.getItem(lsKey("wearable")) || "[]");
  } catch {
    return [];
  }
}

export async function saveWearable(rec: any): Promise<any> {
  const entry = { ...rec, updated_at: new Date().toISOString() };
  if (API_BASE) {
    try {
      const r = await apiFetch("/api/health/wearable", { method: "POST", body: entry });
      return r.record || entry;
    } catch {
      /* 后端暂无该接口时降级本地 */
    }
  }
  const list: any[] = await getWearable();
  const i = list.findIndex((x) => x.date === entry.date && x.source === entry.source);
  const merged = { ...(i >= 0 ? list[i] : {}), ...entry };
  if (i >= 0) list[i] = merged;
  else list.unshift(merged);
  localStorage.setItem(lsKey("wearable"), JSON.stringify(list));
  return merged;
}

/* ── 自助：导出 / 删除 ── */
export async function exportAll() {
  if (API_BASE) return apiFetch("/api/health/export");
  return {
    exported_at: new Date().toISOString(),
    schema_version: 2,
    profile: await getProfile(),
    records: await getRecords(),
    wearable: await getWearable(),
  };
}

export async function deleteAllData() {
  if (API_BASE) return apiFetch("/api/health/data", { method: "DELETE" });
  localStorage.removeItem(lsKey("profile"));
  localStorage.removeItem(lsKey("records"));
  localStorage.removeItem(lsKey("wearable"));
  return { ok: true };
}

export async function deleteAccount() {
  if (API_BASE) return apiFetch("/api/auth/me", { method: "DELETE" });
  localStorage.removeItem(lsKey("profile"));
  localStorage.removeItem(lsKey("records"));
  localStorage.removeItem(lsKey("wearable"));
  return { ok: true };
}
