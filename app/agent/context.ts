// app/agent/context.ts
// 构建健康上下文摘要，注入 system prompt 供大模型理解用户现状。

import { getProfile, getRecords, getWearable } from "../healthStore";

/**
 * 拼装用户健康档案 + 近期数据摘要（控制在 500 字以内）。
 * 用于注入 LLM system prompt，让模型基于真实数据给建议。
 */
export async function buildHealthContext(): Promise<string> {
  let ctx = "";

  try {
    // 读取用户档案
    const profile = await getProfile();
    if (profile) {
      ctx += "【用户健康档案】\n";
      ctx += `姓名: ${profile.name || "未填写"}, 性别: ${profile.gender || "未知"}, `;
      ctx += `身高: ${profile.height || "?"}cm, 体重: ${profile.weight || "?"}kg, `;
      ctx += `年龄: ${profile.age || "?"}岁`;
      if (profile.goal) ctx += `, 目标: ${profile.goal}`;
      ctx += "\n";
    }

    // 读取最近 7 天健康记录
    const records = await getRecords();
    const recent = (records || []).slice(0, 7);
    if (recent.length > 0) {
      ctx += "【近7天数据】\n";
      const sleepArr = recent.filter((r: any) => r.sleep_hours > 0).map((r: any) => r.sleep_hours);
      if (sleepArr.length > 0) {
        const avgSleep = (sleepArr.reduce((a: number, b: number) => a + b, 0) / sleepArr.length).toFixed(1);
        ctx += `平均睡眠: ${avgSleep}h\n`;
      }
      const loadArr = recent.filter((r: any) => r.training_load > 0).map((r: any) => r.training_load);
      if (loadArr.length > 0) {
        const avgLoad = Math.round(loadArr.reduce((a: number, b: number) => a + b, 0) / loadArr.length);
        ctx += `平均训练负荷: ${avgLoad}\n`;
      }
      const postureArr = recent.filter((r: any) => r.posture_score > 0).map((r: any) => r.posture_score);
      if (postureArr.length > 0) {
        const avgPosture = Math.round(postureArr.reduce((a: number, b: number) => a + b, 0) / postureArr.length);
        ctx += `平均体态评分: ${avgPosture}\n`;
      }
    }

    // 读取可穿戴数据
    const wearable = await getWearable();
    const recentW = (wearable || []).slice(0, 7);
    if (recentW.length > 0) {
      ctx += "【可穿戴数据(近7天)】\n";
      const hrArr = recentW.filter((w: any) => w.resting_hr > 0).map((w: any) => w.resting_hr);
      if (hrArr.length > 0) {
        const avgHr = Math.round(hrArr.reduce((a: number, b: number) => a + b, 0) / hrArr.length);
        ctx += `静息心率: ${avgHr}bpm\n`;
      }
      const stepsArr = recentW.filter((w: any) => w.steps > 0).map((w: any) => w.steps);
      if (stepsArr.length > 0) {
        const avgSteps = Math.round(stepsArr.reduce((a: number, b: number) => a + b, 0) / stepsArr.length);
        ctx += `日均步数: ${avgSteps}\n`;
      }
      const hrvArr = recentW.filter((w: any) => w.hrv > 0).map((w: any) => w.hrv);
      if (hrvArr.length > 0) {
        const avgHrv = Math.round(hrvArr.reduce((a: number, b: number) => a + b, 0) / hrvArr.length);
        ctx += `平均HRV: ${avgHrv}ms\n`;
      }
    }
  } catch {
    // 数据读取失败不影响对话
  }

  return ctx || "（暂无健康数据，用户尚未建档）";
}
