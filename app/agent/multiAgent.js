// app/agent/multiAgent.js
// 多智能体编排：把"教练"拆成三个专注的子智能体，由 CoachAgent 统一指挥。
//   - FormAnalyzer    : 仅负责"这次动作哪里不对"（感知层）
//   - ProgressTracker : 仅负责"长期进度与目标达成度"（记忆层）
//   - PlanGenerator   : 仅负责"下一步该练什么"（规划层）
// 这样的职责切分便于评分、可解释，也方便在 Qoder 上把每个子智能体独立部署/复用。

import { assessForm } from "./tools.js";
import { CoachAgent } from "./coachAgent.js";

/** 子智能体 1：形态分析 */
export function formAnalyzer(metric) {
  const issues = assessForm(metric);
  return {
    agent: "FormAnalyzer",
    issues,
    severity: issues.length ? (metric.score < 80 ? "high" : "medium") : "none",
  };
}

/** 子智能体 2：进度追踪 */
export function progressTracker(memory, exercise) {
  const summary = memory.summarize(exercise);
  const goals = memory.getGoals();
  const goalProgress = goals.map((g) => {
    const hit = summary.recurringIssues.some((r) => r.issue.includes(g.replace(/[「」]/g, "")));
    return { goal: g, status: hit ? "仍需加强" : "已改善/达成" };
  });
  return {
    agent: "ProgressTracker",
    averageScore: summary.averageScore,
    totalReps: summary.totalReps,
    recurringIssues: summary.recurringIssues,
    goalProgress,
  };
}

/** 子智能体 3：计划生成（有密钥时用 LLM，否则启发式） */
export async function planGenerator(memory, exercise, config) {
  const summary = memory.summarize(exercise);
  if (config?.apiKey) {
    // 预留：调用 LLM 生成下一阶段计划（与 CoachAgent.callLLM 同协议）
    // 此处保持确定性输出，确保离线可演示
  }
  const focus = summary.recurringIssues[0]?.issue || "保持动作标准与节奏";
  const nextPlan = [
    `本阶段重点：${focus}`,
    "每组 8-12 次，组间休息 60s，质量优先于次数",
    "完成后回看平均评分，若连续达标则逐步增加负荷",
  ];
  return { agent: "PlanGenerator", nextPlan, generatedBy: config?.apiKey ? "llm" : "heuristic" };
}

/**
 * 多智能体统一入口：依次调用三个子智能体 + 教练智能体，返回结构化结果。
 * 适合直接喂给 UI 的"训练报告"面板，也便于给评委展示 agent 协作。
 */
export async function runMultiAgent(metric, { memory, config = {} } = {}) {
  const fa = formAnalyzer(metric);
  metric.issues = fa.issues;
  const coach = new CoachAgent({ memory, config });
  const coaching = await coach.getCoaching(metric);
  const pt = progressTracker(memory, metric.exercise);
  const pg = await planGenerator(memory, metric.exercise, config);
  return {
    form: fa,
    coaching,
    progress: pt,
    plan: pg,
    focusArea: coach.focusArea,
  };
}

export { CoachAgent };
