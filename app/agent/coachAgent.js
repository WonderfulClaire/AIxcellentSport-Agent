// app/agent/coachAgent.js
// 教练智能体（编排核心）。
// 一次动作完成后被调用：评估 → 记忆 → 规划 → 生成自适应反馈。
// LLM 调用遵循 OpenAI 兼容协议（base_url 可换成 Qwen/DashScope、DeepSeek、OpenAI 等），
// 未配置密钥或调用失败时自动降级为确定性启发式，保证演示永不翻车。

import { assessForm, getTool } from "./tools.js";

/**
 * Provider-agnostic LLM 调用（OpenAI 兼容 /chat/completions）。
 * @returns {Promise<string|null>} 模型文本，或 null（需走兜底）
 */
async function callLLM(messages, config, tools) {
  if (!config || !config.apiKey || !config.baseUrl) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.timeoutMs || 8000);
  try {
    const body = {
      model: config.model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
    };
    if (tools && tools.length) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = "auto";
    }
    const res = await fetch(config.baseUrl.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    // 若模型选择了工具调用，简单执行并继续（这里仅处理 set_goal）
    if (msg?.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        if (tc.function?.name === "set_goal") {
          try {
            const args = JSON.parse(tc.function.arguments || "{}");
            getTool("set_goal")?.run(args, { memory: config._memory });
          } catch {
            /* ignore */
          }
        }
      }
    }
    return msg?.content ?? null;
  } catch {
    return null; // 网络/鉴权异常 / 超时 → 兜底
  } finally {
    clearTimeout(timer);
  }
}

/** 确定性兜底：基于问题 + 记忆生成反馈（无密钥也成立） */
function heuristicCoaching({ issues, recurring, focusArea, exercise, score }) {
  if (issues.length) {
    const top = issues[0];
    const tone = "warn";
    const map = {
      "膝盖内扣(valgus)": "膝盖有内扣趋势，主动朝脚尖方向推开，想象把地面踩宽。",
      "左右不对称": "左右发力不均，慢下来感受弱侧，先求对称再求速度。",
      "下蹲深度不足": "再蹲深一点，髋部低于膝盖，脚跟踩稳。",
      "躯干下沉/核心松散": "收紧核心，肩-髋-踝保持一条线，别塌腰。",
      "下放幅度不足": "下放得更彻底些，胸贴近地面再推起。",
      "开合幅度不到位": "手脚再打开一些，动作做满。",
    };
    return { message: map[top] || `注意：${top}，放慢节奏做标准。`, tone, focusArea };
  }
  if (recurring.length && recurring[0].count >= 2) {
    return {
      message: `你近期常出现「${recurring[0].issue}」，这轮先专项纠正它，质量优先于次数。`,
      tone: "warn",
      focusArea: recurring[0].issue,
    };
  }
  const praise = score >= 92 ? "动作很标准，保持节奏继续。" : "不错，稳住这个质量。";
  return { message: praise, tone: "good", focusArea: focusArea || "保持" };
}

export class CoachAgent {
  /**
   * @param {{memory:import('./memory.js').AgentMemory, config?:any}} deps
   */
  constructor({ memory, config = {} }) {
    this.memory = memory;
    this.config = config;
    this.focusArea = null;
  }

  /**
   * 处理一次完成的动作，返回自适应教练反馈。
   * @param {{exercise:string, repIndex:number, score:number, jointAngle:number, symmetryError?:number, kneeGap?:number, ankleGap?:number, bodyLine?:number}} metric
   * @returns {Promise<{message:string, tone:'good'|'warn', focusArea:string|null, source:'llm'|'heuristic'}>}
   */
  async getCoaching(metric) {
    // 1) 评估（工具：assess_form）
    const issues = assessForm(metric);
    metric.issues = issues;

    // 2) 记忆（工具：log_rep）
    getTool("log_rep").run(metric, { memory: this.memory });

    // 3) 规划：依据记忆里的"反复问题"决定本次重点
    const recurring = this.memory.getRecurringIssues(metric.exercise);
    if (recurring.length) this.focusArea = recurring[0].issue;
    const summary = this.memory.summarize(metric.exercise);

    // 4) 生成反馈
    let message = null;
    let source = "heuristic";
    if (this.config.apiKey) {
      const sys = [
        "你是 AIxcellentSport 的私人动作教练智能体，运行在用户浏览器端（隐私优先）。",
        "你拥有用户的历史记忆（重复出现的问题、平均分、目标）。",
        "请基于本次动作指标与历史，给出一句短促、可执行、当下就能做的纠正或鼓励。",
        "语气：发现问题用 warn，动作标准用 good。输出严格 JSON：{\"message\":\"...\",\"tone\":\"good|warn\",\"focusArea\":\"...|null\"}。",
        `用户记忆摘要：${JSON.stringify(summary)}`,
      ].join("\n");
      const user = `本次动作：${metric.exercise} 第${metric.repIndex}次，评分${metric.score}，关键角度${metric.jointAngle}°，问题标签：${issues.join("、") || "无"}。`;
      const reply = await callLLM(
        [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        { ...this.config, _memory: this.memory },
        [getTool("set_goal")],
      );
      if (reply) {
        try {
          const parsed = JSON.parse(reply);
          message = parsed.message;
          this.focusArea = parsed.focusArea ?? this.focusArea;
          source = "llm";
          return {
            message,
            tone: parsed.tone === "warn" ? "warn" : "good",
            focusArea: this.focusArea,
            source,
          };
        } catch {
          // 模型没返回合法 JSON，退回启发式
        }
      }
    }

    const h = heuristicCoaching({
      issues,
      recurring,
      focusArea: this.focusArea,
      exercise: metric.exercise,
      score: metric.score,
    });
    return { ...h, source };
  }
}

export default CoachAgent;
