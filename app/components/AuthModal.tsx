import { useState } from "react";
import { login, register } from "../healthStore";
import { setSession, API_BASE } from "../api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
};

export default function AuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setError("");
    if (!email || !password) {
      setError("请输入邮箱与密码");
      return;
    }
    setBusy(true);
    try {
      const r =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, name);
      setSession(r.token, r.user);
      onSuccess(r.user);
      setEmail("");
      setPassword("");
      setName("");
    } catch (e: any) {
      setError(e?.message || "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className="auth-brand">
          <span className="brand-mark">✦</span>
          <span>AIxcellent 私享管家</span>
        </div>
        <h2>{mode === "login" ? "欢迎回来" : "创建你的私人健康档案"}</h2>
        <p className="auth-sub">
          {API_BASE ? "登录后数据加密同步至你的专属云端账户" : "本地演示模式 · 数据保存在本机浏览器"}
        </p>

        {mode === "register" && (
          <label className="auth-field">
            <span>昵称</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：Claire" />
          </label>
        )}
        <label className="auth-field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="auth-field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-button auth-submit" onClick={submit} disabled={busy}>
          {busy ? "处理中…" : mode === "login" ? "登录" : "注册并建档"}
          <span>→</span>
        </button>

        <p className="auth-switch">
          {mode === "login" ? "还没有档案？" : "已有账户？"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "立即创建" : "去登录"}
          </button>
        </p>
        <p className="auth-compliance">
          本健康方案仅作日常养护参考，不替代专业医疗诊断。
        </p>
      </div>
    </div>
  );
}
