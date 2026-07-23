// app/agent/memory.js
// Agent 的长期/会话记忆。默认只存在浏览器本地（隐私优先），
// 也可以通过 injectStore 注入服务端 KV（如 Cloudflare KV / Redis）以便跨设备。
//
// 设计要点：
//  - 记忆里只存"结构化指标文本"，绝不存视频帧或原始图像（隐私红线）。
//  - 记忆驱动 Agent 的自适应：同一问题反复出现 → 升级为"重点纠正项"。

import { assessForm } from "./form.js";

/**
 * @typedef {Object} RepRecord
 * @property {string} exercise  squat | pushup | jack
 * @property {number} repIndex  第几次
 * @property {number} score      0-100 动作质量分
 * @property {number} jointAngle 关键角度(度)
 * @property {string[]} issues   本次发现的问题标签
 * @property {number} timestamp  ms
 */

const STORAGE_KEY = "aix_agent_memory_v1";

/** 简单可插拔存储：默认内存，浏览器下桥接 localStorage */
function createStore() {
  if (typeof localStorage !== "undefined") {
    return {
      get() {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        } catch {
          return null;
        }
      },
      set(obj) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch {
          /* 隐私模式或配额满时静默降级 */
        }
      },
    };
  }
  // Node / 服务端兜底：进程内 Map
  let mem = null;
  return {
    get() {
      return mem;
    },
    set(obj) {
      mem = obj;
    },
  };
}

export class AgentMemory {
  /**
   * @param {Partial<{userId:string, store:any, goals:string[]}>} [opts]
   */
  constructor(opts = {}) {
    this.userId = opts.userId || "local-user";
    this.store = opts.store || createStore();
    this.goals = opts.goals ? [...opts.goals] : [];
    const loaded = this.store.get();
    if (loaded && loaded.userId === this.userId) {
      this.records = loaded.records || [];
      this.goals = loaded.goals || this.goals;
    } else {
      this.records = [];
    }
  }

  /** 持久化当前状态 */
  _persist() {
    this.store.set({
      userId: this.userId,
      records: this.records.slice(-500), // 只保留最近 500 条，控制体积
      goals: this.goals,
    });
  }

  /** 记录一次动作完成（工具：log_rep） */
  recordRep(rep) {
    const issues =
      rep.issues && rep.issues.length
        ? rep.issues
        : assessForm({
            exercise: rep.exercise,
            score: rep.score,
            jointAngle: rep.jointAngle,
            symmetryError: rep.symmetryError,
            kneeGap: rep.kneeGap,
            ankleGap: rep.ankleGap,
            bodyLine: rep.bodyLine,
          });
    this.records.push({
      exercise: rep.exercise,
      repIndex: rep.repIndex,
      score: rep.score,
      jointAngle: rep.jointAngle,
      issues,
      timestamp: rep.timestamp || Date.now(),
    });
    this._persist();
  }

  /** 取某动作的历史（工具：get_history） */
  getHistory(exercise, limit = 20) {
    return this.records
      .filter((r) => r.exercise === exercise)
      .slice(-limit);
  }

  /** 统计每个问题标签出现的频次 → 找出"反复出现"的问题 */
  getRecurringIssues(exercise, minCount = 2) {
    const counts = {};
    for (const r of this.getHistory(exercise)) {
      for (const issue of r.issues) {
        counts[issue] = (counts[issue] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .filter(([, c]) => c >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ issue, count }));
  }

  /** 当前动作的平均分（用于进度追踪） */
  averageScore(exercise) {
    const h = this.getHistory(exercise);
    if (!h.length) return null;
    return Math.round(h.reduce((s, r) => s + r.score, 0) / h.length);
  }

  /** 设定目标（工具：set_goal） */
  setGoals(goals) {
    this.goals = Array.isArray(goals) ? goals : [goals];
    this._persist();
    return this.goals;
  }

  getGoals() {
    return [...this.goals];
  }

  /** 一句可喂给 LLM 的记忆摘要 */
  summarize(exercise) {
    const hist = this.getHistory(exercise);
    const recurring = this.getRecurringIssues(exercise);
    const avg = this.averageScore(exercise);
    return {
      totalReps: hist.length,
      averageScore: avg,
      recurringIssues: recurring,
      goals: this.goals,
    };
  }
}

export default AgentMemory;
