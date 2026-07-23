// tests/agent.test.js
// Agent 层单元测试：无需浏览器、无需 LLM 密钥即可验证核心逻辑。
// 运行：node --test tests/agent.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import { AgentMemory, CoachAgent, runMultiAgent, assessForm } from "../app/agent/index.js";

function freshMemory() {
  return new AgentMemory({ userId: "test-user-" + Math.random().toString(36).slice(2) });
}

const squatValgus = {
  exercise: "squat",
  repIndex: 1,
  score: 70,
  jointAngle: 95,
  symmetryError: 4,
  kneeGap: 0.2,
  ankleGap: 0.5,
};

test("assessForm 能识别膝盖内扣", () => {
  const issues = assessForm(squatValgus);
  assert.ok(issues.includes("膝盖内扣(valgus)"));
});

test("记忆能累积并识别反复出现的问题", () => {
  const mem = freshMemory();
  for (let i = 1; i <= 3; i++) {
    mem.recordRep({ ...squatValgus, repIndex: i, timestamp: 1000 + i });
  }
  const recurring = mem.getRecurringIssues("squat");
  const valgus = recurring.find((r) => r.issue === "膝盖内扣(valgus)");
  assert.ok(valgus, "应识别到反复出现的膝盖内扣");
  assert.equal(valgus.count, 3);
  assert.equal(mem.averageScore("squat"), 70);
});

test("无密钥时 CoachAgent 仍返回自适应反馈(启发式兜底)", async () => {
  const mem = freshMemory();
  const coach = new CoachAgent({ memory: mem, config: {} });
  let last;
  for (let i = 1; i <= 3; i++) {
    last = await coach.getCoaching({ ...squatValgus, repIndex: i, timestamp: 1000 + i });
  }
  assert.equal(last.source, "heuristic");
  assert.equal(last.tone, "warn");
  assert.match(last.message, /膝盖/);
  assert.ok(last.focusArea && last.focusArea.includes("valgus"));
});

test("无密钥时永不抛错（兜底健壮性）", async () => {
  const mem = freshMemory();
  const r = await runMultiAgent(
    { exercise: "pushup", repIndex: 1, score: 88, jointAngle: 150, bodyLine: 170 },
    { memory: mem, config: {} },
  );
  assert.ok(r.form && r.coaching && r.progress && r.plan);
  assert.ok(typeof r.coaching.message === "string" && r.coaching.message.length > 0);
});

test("多智能体返回结构化的训练报告", async () => {
  const mem = freshMemory();
  mem.setGoals(["改善膝盖内扣"]);
  const r = await runMultiAgent(
    { exercise: "squat", repIndex: 5, score: 75, jointAngle: 96, kneeGap: 0.2, ankleGap: 0.5 },
    { memory: mem, config: {} },
  );
  assert.equal(r.form.agent, "FormAnalyzer");
  assert.equal(r.progress.agent, "ProgressTracker");
  assert.equal(r.plan.agent, "PlanGenerator");
  assert.ok(Array.isArray(r.plan.nextPlan) && r.plan.nextPlan.length > 0);
});
