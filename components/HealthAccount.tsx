"use client";

import { useEffect, useState } from "react";
import {
  login,
  register,
  logout,
  fetchMe,
  getUser,
  type AuthUser,
} from "../lib/healthApi";

/**
 * 云端账号面板（注册 / 登录 / 退出）。
 *
 * - 登录成功后，令牌写入 localStorage，并广播 AUTH_EVENT，DailyTipCard 会自动刷新为个性化推送。
 * - 未登录时展示登录/注册表单；已登录时展示当前账号与退出按钮。
 * - 与"本地优先"主流程解耦：不登录也不影响本地功能。
 */
export default function HealthAccount() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    fetchMe().then((u) => setUser(u));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(email.trim(), password, name.trim() || undefined);
      setUser(u);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  function onLogout() {
    logout();
    setUser(null);
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  }

  return (
    <section className="aix-acct" aria-label="云端账号">
      <style>{css}</style>
      <div className="aix-acct-inner">
        {user ? (
          <div className="aix-acct-signed">
            <div className="aix-acct-who">
              <span className="aix-acct-tag">已登录</span>
              <span className="aix-acct-email">{user.name || user.email}</span>
              {user.role === "admin" && <span className="aix-acct-role">管理员</span>}
            </div>
            <button type="button" className="aix-acct-btn ghost" onClick={onLogout}>
              退出登录
            </button>
          </div>
        ) : (
          <form className="aix-acct-form" onSubmit={onSubmit}>
            <div className="aix-acct-head">
              <span className="aix-acct-tag">云端账号</span>
              <div className="aix-acct-switch">
                <button
                  type="button"
                  className={mode === "login" ? "on" : ""}
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  登录
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "on" : ""}
                  onClick={() => { setMode("register"); setError(null); }}
                >
                  注册
                </button>
              </div>
            </div>

            {mode === "register" && (
              <input
                className="aix-acct-input"
                type="text"
                placeholder="昵称（可选）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
              />
            )}
            <input
              className="aix-acct-input"
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              className="aix-acct-input"
              type="password"
              placeholder={mode === "register" ? "密码（至少 6 位）" : "密码"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />

            {error && <p className="aix-acct-err">{error}</p>}

            <button type="submit" className="aix-acct-btn" disabled={busy}>
              {busy ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
            </button>
            <p className="aix-acct-hint">
              登录后即可在下方看到「按你的画像个性化」的每日健康小推送。数据加密存储于云端，可随时导出 / 删除。
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

const css = `
.aix-acct { --acid:#b7ff2a; --ink:#071521; --muted:#667f92;
  max-width: 1180px; margin: 18px auto 0; padding: 0 5vw; font-family: Arial, Helvetica, sans-serif; }
.aix-acct-inner { border:1px solid rgba(7,21,33,.13); border-left:5px solid var(--acid);
  border-radius:14px; background:#fff; padding:16px 20px; box-shadow:0 1px 0 rgba(7,21,33,.04); }
.aix-acct-tag { display:inline-block; font:800 11px/1 monospace; letter-spacing:.14em; text-transform:uppercase;
  color:#0a3d1f; background:var(--acid); padding:5px 8px; border-radius:6px; }
.aix-acct-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.aix-acct-switch { display:inline-flex; gap:4px; background:#f1f5f7; border-radius:8px; padding:3px; }
.aix-acct-switch button { border:0; background:transparent; color:var(--muted); font-size:13px; font-weight:700;
  padding:6px 12px; border-radius:6px; cursor:pointer; }
.aix-acct-switch button.on { background:#fff; color:var(--ink); box-shadow:0 1px 2px rgba(7,21,33,.12); }
.aix-acct-form { display:flex; flex-direction:column; gap:10px; }
.aix-acct-input { border:1px solid rgba(7,21,33,.18); border-radius:9px; padding:11px 13px; font-size:14px;
  color:var(--ink); outline:none; }
.aix-acct-input:focus { border-color:var(--acid); box-shadow:0 0 0 3px rgba(183,255,42,.28); }
.aix-acct-btn { border:0; border-radius:9px; padding:12px 14px; font-size:14px; font-weight:800; cursor:pointer;
  background:var(--ink); color:#fff; }
.aix-acct-btn:disabled { opacity:.6; cursor:default; }
.aix-acct-btn.ghost { background:#f1f5f7; color:var(--ink); }
.aix-acct-err { margin:0; color:#c0392b; font-size:13px; }
.aix-acct-hint { margin:2px 0 0; color:#9aa9b5; font-size:12px; line-height:1.6; }
.aix-acct-signed { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.aix-acct-who { display:flex; align-items:center; gap:10px; min-width:0; }
.aix-acct-email { color:var(--ink); font-size:15px; font-weight:700; overflow:hidden; text-overflow:ellipsis; }
.aix-acct-role { font-size:11px; font-weight:800; color:#0a3d1f; background:var(--acid); padding:3px 7px; border-radius:6px; }
@media (max-width:620px){ .aix-acct-inner{ padding:14px; } }
`;
