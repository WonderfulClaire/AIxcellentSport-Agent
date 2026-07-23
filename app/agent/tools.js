// app/agent/tools.js
// Agent 可调用的工具（函数）注册表。
// 既可以被 CoachAgent 直接用，也可以作为 LLM function-calling 的 schema 暴露给模型。

import { AgentMemory } from "./memory.js";
export { assessForm } from "./form.js";

/** 工具清单（含 JSON schema，供 LLM function calling 使用） */
export const TOOLS = [
  {
    name: "assess_form",
    description: "从一次动作的关键指标中识别问题标签（如膝盖内扣、躯干下沉）。",
    parameters: {
      type: "object",
      properties: {
        exercise: { type: "string", enum: ["squat", "pushup", "jack"] },
        score: { type: "number" },
        jointAngle: { type: "number" },
        symmetryError: { type: "number" },
        kneeGap: { type: "number" },
        ankleGap: { type: "number" },
        bodyLine: { type: "number" },
      },
      required: ["exercise", "score", "jointAngle"],
    },
    run: (args) => ({ issues: assessForm(args) }),
  },
  {
    name: "log_rep",
    description: "把一次完成的动作写入用户记忆，用于跨动作/跨会话追踪进度。",
    parameters: {
      type: "object",
      properties: {
        exercise: { type: "string" },
        repIndex: { type: "number" },
        score: { type: "number" },
        jointAngle: { type: "number" },
        issues: { type: "array", items: { type: "string" } },
      },
      required: ["exercise", "repIndex", "score", "jointAngle"],
    },
    run: (args, ctx) => {
      ctx.memory.recordRep(args);
      return { ok: true, totalReps: ctx.memory.getHistory(args.exercise).length };
    },
  },
  {
    name: "get_recurring_issues",
    description: "获取某一动作反复出现（>=2次）的问题，用于决定本次训练重点。",
    parameters: {
      type: "object",
      properties: { exercise: { type: "string" } },
      required: ["exercise"],
    },
    run: (args, ctx) => ctx.memory.getRecurringIssues(args.exercise),
  },
  {
    name: "set_goal",
    description: "设定本次/下一阶段的训练目标（如'改善膝盖内扣'）。",
    parameters: {
      type: "object",
      properties: { goals: { type: "array", items: { type: "string" } } },
      required: ["goals"],
    },
    run: (args, ctx) => ({ goals: ctx.memory.setGoals(args.goals) }),
  },
];

/** 按名称取工具 */
export function getTool(name) {
  return TOOLS.find((t) => t.name === name);
}

export { AgentMemory };
