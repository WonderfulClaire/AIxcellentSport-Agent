import { useEffect, useState } from "react";
import ModuleIntro from "./ModuleIntro";
import {
  getProfile,
  saveProfile,
  getSummary,
  saveRecord,
  exportAll,
  deleteAllData,
  deleteAccount,
} from "../healthStore";
import { clearSession } from "../api";

type Props = {
  user: any;
  onLaunch: (tab: string) => void;
  onLogout: () => void;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function deriveAdvice(latest: any, profile: any): { title: string; text: string } {
  if (!latest) {
    return {
      title: "先完成今日打卡",
      text: "记录今天的睡眠、精力与训练，管家才能开始为你动态调整方案。",
    };
  }
  if (latest.sleep_hours != null && latest.sleep_hours < 6.5) {
    return {
      title: "今晚优先把睡眠补回来",
      text: `昨日睡眠仅 ${latest.sleep_hours} 小时。建议今晚提前 30 分钟休息，训练负荷下调一档，避免叠加疲劳。`,
    };
  }
  if (latest.stress_level === "high") {
    return {
      title: "压力偏高，先恢复再训练",
      text: "今日压力标记为「高」。建议加入 10 分钟呼吸放松，并把高强度训练替换为低强度活动。",
    };
  }
  if (latest.posture_score != null && latest.posture_score < 75) {
    return {
      title: "体态还有提升空间",
      text: `最近体态评分 ${latest.posture_score}。可在「体态评估」做一轮扫描，针对性矫正圆肩/驼背。`,
    };
  }
  return {
    title: "状态平稳，保持节奏",
    text: "各项指标在健康区间。维持当前训练与作息，管家会持续随你的记录微调。",
  };
}

export default function MemberHome({ user, onLaunch, onLogout }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>({ latest: null, avg: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"home" | "profile" | "settings">("home");

  // 建档表单
  const [f, setF] = useState({ height: "", weight: "", birth_year: "", sex: "", goals: "", restrictions: "" });
  // 今日打卡
  const [check, setCheck] = useState({ sleep_hours: "", stress_level: "mid", training_load: "", posture_score: "", energy_level: "", note: "" });
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([getProfile(), getSummary()]);
    setProfile(p);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const saveProfileClick = async () => {
    const payload = {
      height: f.height ? Number(f.height) : null,
      weight: f.weight ? Number(f.weight) : null,
      birth_year: f.birth_year ? Number(f.birth_year) : null,
      sex: f.sex || null,
      goals: f.goals ? f.goals.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [],
      restrictions: f.restrictions ? f.restrictions.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [],
    };
    await saveProfile(payload);
    flash("档案已保存");
    load();
    setTab("home");
  };

  const checkIn = async () => {
    const rec = {
      date: todayStr(),
      sleep_hours: check.sleep_hours ? Number(check.sleep_hours) : null,
      stress_level: check.stress_level,
      training_load: check.training_load ? Number(check.training_load) : null,
      posture_score: check.posture_score ? Number(check.posture_score) : null,
      energy_level: check.energy_level ? Number(check.energy_level) : null,
      note: check.note || null,
    };
    await saveRecord(rec);
    flash("今日状态已记录");
    load();
  };

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aixcellent-health-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("数据已导出");
  };

  const doDeleteData = async () => {
    if (!confirm("确定删除全部健康数据（档案与所有每日记录）？此操作不可恢复。")) return;
    await deleteAllData();
    flash("健康数据已清除");
    load();
  };

  const doDeleteAccount = async () => {
    if (!confirm("确定注销账户？你的档案与全部健康数据将被永久删除，且无法恢复。")) return;
    await deleteAccount();
    clearSession();
    onLogout();
  };

  const advice = deriveAdvice(summary.latest, profile);
  const todos: { label: string; done: boolean; action?: string }[] = [
    { label: "完成今日健康打卡", done: !!summary.latest && summary.latest.date === todayStr(), action: "home" },
    { label: profile ? "健康档案已建立" : "建立健康档案（建档）", done: !!profile, action: "profile" },
    { label: "查看本周数据趋势", done: (summary.avg?.cnt || 0) >= 3, action: "dashboard" },
  ];

  const avatar = (user?.name || user?.email || "会员").slice(0, 1).toUpperCase();

  return (
    <div className="member">
      <ModuleIntro
        title="我的主页"
        what="管理个人档案、查看健康概览和账号设置"
        how={["完善个人健康档案","查看健康数据概览","管理账号和偏好设置"]}
      />
      {/* 顶栏信息条 */}
      <div className="member-bar">
        <div className="member-id">
          <span className="member-avatar">{avatar}</span>
          <div>
            <strong>{user?.name || user?.email || "会员"}</strong>
            <small>{user?.local ? "本地演示账户" : "云端会员账户"}</small>
          </div>
        </div>
        <nav className="member-tabs">
          <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")}>
            今日
          </button>
          <button className={tab === "profile" ? "on" : ""} onClick={() => setTab("profile")}>
            我的档案
          </button>
          <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>
            账号设置
          </button>
          <button className="member-logout" onClick={onLogout}>
            退出
          </button>
        </nav>
      </div>

      {toast && <div className="member-toast">{toast}</div>}

      {loading ? (
        <div className="member-loading">正在读取你的健康档案…</div>
      ) : tab === "home" ? (
        <div className="member-grid">
          {/* 最重要建议 */}
          <section className="m-card m-advice">
            <span className="m-tag">管家今日建议</span>
            <h3>{advice.title}</h3>
            <p>{advice.text}</p>
          </section>

          {/* 今日状态快照 */}
          <section className="m-card">
            <span className="m-tag">今日状态</span>
            <div className="m-stats">
              <div>
                <small>睡眠</small>
                <strong>{summary.latest?.sleep_hours ?? "—"}<i>h</i></strong>
              </div>
              <div>
                <small>精力</small>
                <strong>{summary.latest?.energy_level ?? "—"}<i>/5</i></strong>
              </div>
              <div>
                <small>训练负荷</small>
                <strong>{summary.latest?.training_load ?? "—"}</strong>
              </div>
              <div>
                <small>体态</small>
                <strong>{summary.latest?.posture_score ?? "—"}</strong>
              </div>
            </div>
            <p className="m-avg">
              近 {summary.avg?.cnt || 0} 天均值 · 睡眠 {summary.avg ? summary.avg.avg_sleep.toFixed(1) : "—"}h ·
              负荷 {summary.avg ? Math.round(summary.avg.avg_load) : "—"}
            </p>
          </section>

          {/* 待办 */}
          <section className="m-card">
            <span className="m-tag">待完成事项</span>
            <ul className="m-todos">
              {todos.map((t, i) => (
                <li key={i} className={t.done ? "done" : ""}>
                  <span className="tick">{t.done ? "✓" : ""}</span>
                  <span>{t.label}</span>
                  {!t.done && t.action && (
                    <button
                      className="m-todo-go"
                      onClick={() => (t.action === "dashboard" ? onLaunch("dashboard") : setTab(t.action as any))}
                    >
                      去完成
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* 今日打卡 */}
          <section className="m-card m-checkin">
            <span className="m-tag">今日打卡 · {todayStr()}</span>
            <div className="m-form">
              <label>睡眠(h)<input value={check.sleep_hours} onChange={(e) => setCheck({ ...check, sleep_hours: e.target.value })} placeholder="7.0" /></label>
              <label>精力(1-5)<input value={check.energy_level} onChange={(e) => setCheck({ ...check, energy_level: e.target.value })} placeholder="4" /></label>
              <label>训练负荷<input value={check.training_load} onChange={(e) => setCheck({ ...check, training_load: e.target.value })} placeholder="40" /></label>
              <label>体态分<input value={check.posture_score} onChange={(e) => setCheck({ ...check, posture_score: e.target.value })} placeholder="82" /></label>
              <label>
                压力
                <select value={check.stress_level} onChange={(e) => setCheck({ ...check, stress_level: e.target.value })}>
                  <option value="low">低</option>
                  <option value="mid">中</option>
                  <option value="high">高</option>
                </select>
              </label>
              <label className="full">
                备注
                <input value={check.note} onChange={(e) => setCheck({ ...check, note: e.target.value })} placeholder="今日状态 / 感受" />
              </label>
            </div>
            <button className="primary-button" onClick={checkIn}>
              记录今日状态 <span>→</span>
            </button>
          </section>

          {/* 快捷进入工作台 */}
          <section className="m-card m-quick">
            <span className="m-tag">专项工作台</span>
            <div className="m-quick-grid">
              {[
                { k: "posture", l: "体态评估" },
                { k: "sleep", l: "睡眠" },
                { k: "nutrition", l: "营养" },
                { k: "energy", l: "能量" },
                { k: "dashboard", l: "数据面板" },
                { k: "tcm", l: "养生" },
              ].map((x) => (
                <button key={x.k} onClick={() => onLaunch(x.k)}>
                  {x.l}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : tab === "profile" ? (
        <div className="member-grid">
          <section className="m-card m-profile">
            <span className="m-tag">健康档案（建档）</span>
            {profile && (
              <p className="m-profile-echo">
                已建档：{profile.height ? `身高 ${profile.height}cm` : ""}
                {profile.weight ? ` · 体重 ${profile.weight}kg` : ""}
                {profile.goals ? ` · 目标 ${JSON.parse(profile.goals).join("、")}` : ""}
              </p>
            )}
            <div className="m-form">
              <label>身高(cm)<input value={f.height} onChange={(e) => setF({ ...f, height: e.target.value })} placeholder={profile?.height || ""} /></label>
              <label>体重(kg)<input value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} placeholder={profile?.weight || ""} /></label>
              <label>出生年<input value={f.birth_year} onChange={(e) => setF({ ...f, birth_year: e.target.value })} placeholder={profile?.birth_year || ""} /></label>
              <label>
                性别
                <select value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })}>
                  <option value="">未填写</option>
                  <option value="女">女</option>
                  <option value="男">男</option>
                </select>
              </label>
              <label className="full">目标（逗号分隔）<input value={f.goals} onChange={(e) => setF({ ...f, goals: e.target.value })} placeholder={profile?.goals ? JSON.parse(profile.goals).join("、") : "减脂、改善体态"} /></label>
              <label className="full">需规避限制（逗号分隔）<input value={f.restrictions} onChange={(e) => setF({ ...f, restrictions: e.target.value })} placeholder={profile?.restrictions ? JSON.parse(profile.restrictions).join("、") : "膝盖不适"} /></label>
            </div>
            <button className="primary-button" onClick={saveProfileClick}>
              保存档案 <span>→</span>
            </button>
          </section>
        </div>
      ) : (
        <div className="member-grid">
          <section className="m-card m-settings">
            <span className="m-tag">账号与数据</span>
            <p className="m-set-note">
              你的健康数据{user?.local ? "保存在本机浏览器" : "加密存储于专属云端账户"}，仅你本人可访问，
              你可随时导出或彻底删除。
            </p>
            <div className="m-set-actions">
              <button className="ghost-btn" onClick={doExport}>导出我的全部数据</button>
              <button className="ghost-btn danger" onClick={doDeleteData}>删除全部健康数据</button>
              <button className="ghost-btn danger" onClick={doDeleteAccount}>注销账户</button>
            </div>
            <p className="m-set-law">依据《个人信息保护法》，你享有查阅、复制、更正、删除个人信息的权利。</p>
          </section>
        </div>
      )}
    </div>
  );
}
