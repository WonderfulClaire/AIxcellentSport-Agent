// app/agent/healthConcierge.js
// 私人医生健康管家引擎：对标富豪管家医疗 —— 健康画像 → 生物标志物追踪 → 预防筛查 → 阶段式长寿计划 → 就医红线

import { callLLM } from "./coachAgent.js";

/**
 * 生物标志物参考范围（模拟富豪年度体检的100+项，精选关键项）
 */
export const BIOMARKERS = {
  // 代谢
  glucose: { name: "空腹血糖", unit: "mmol/L", low: 3.9, high: 6.1, optimal: [4.4, 5.5], category: "代谢" },
  hba1c: { name: "糖化血红蛋白", unit: "%", low: 4.0, high: 6.0, optimal: [4.5, 5.5], category: "代谢" },
  insulin: { name: "空腹胰岛素", unit: "μIU/mL", low: 2, high: 19, optimal: [2, 8], category: "代谢" },
  // 血脂
  totalChol: { name: "总胆固醇", unit: "mmol/L", low: 0, high: 5.2, optimal: [3.0, 5.0], category: "血脂" },
  ldl: { name: "低密度脂蛋白", unit: "mmol/L", low: 0, high: 3.4, optimal: [1.5, 2.6], category: "血脂" },
  hdl: { name: "高密度脂蛋白", unit: "mmol/L", low: 1.0, high: 3.0, optimal: [1.3, 2.0], category: "血脂" },
  trig: { name: "甘油三酯", unit: "mmol/L", low: 0.3, high: 1.7, optimal: [0.5, 1.2], category: "血脂" },
  // 炎症
  crp: { name: "C反应蛋白", unit: "mg/L", low: 0, high: 3, optimal: [0, 1], category: "炎症" },
  // 激素
  cortisol: { name: "皮质醇(晨)", unit: "nmol/L", low: 138, high: 690, optimal: [200, 500], category: "激素" },
  testosterone: { name: "睾酮", unit: "nmol/L", low: 8, high: 35, optimal: [12, 30], category: "激素" },
  // 营养
  vitD: { name: "维生素D", unit: "nmol/L", low: 50, high: 250, optimal: [75, 150], category: "营养" },
  ferritin: { name: "铁蛋白", unit: "μg/L", low: 30, high: 400, optimal: [50, 200], category: "营养" },
  b12: { name: "维生素B12", unit: "pmol/L", low: 140, high: 750, optimal: [200, 500], category: "营养" },
  // 肝肾
  alt: { name: "谷丙转氨酶", unit: "U/L", low: 7, high: 40, optimal: [10, 30], category: "肝肾" },
  creatinine: { name: "肌酐", unit: "μmol/L", low: 44, high: 106, optimal: [50, 90], category: "肝肾" },
  // 其他
  homocysteine: { name: "同型半胱氨酸", unit: "μmol/L", low: 5, high: 15, optimal: [6, 10], category: "其他" },
  uricAcid: { name: "尿酸", unit: "μmol/L", low: 150, high: 420, optimal: [200, 360], category: "其他" },
};

/**
 * 评估单个标志物状态：normal / optimal / warning / danger
 */
export function evaluateMarker(key, value) {
  const def = BIOMARKERS[key];
  if (!def || value == null) return null;
  if (value < def.optimal[0] || value > def.optimal[1]) {
    if (value < def.low || value > def.high) {
      return { status: "danger", color: "#ef4444", msg: value < def.low ? "偏低" : "偏高" };
    }
    return { status: "warning", color: "#f97316", msg: value < def.optimal[0] ? "略低" : "略高" };
  }
  return { status: "optimal", color: "#22c55e", msg: "理想" };
}

/**
 * 预防筛查时间表（按年龄/性别）
 */
export function getScreeningSchedule(profile) {
  const { gender, age } = profile;
  const items = [];
  // 通用
  items.push({ name: "血压监测", freq: "每年", due: age >= 18 });
  items.push({ name: "血脂检查", freq: "每年", due: age >= 20 });
  items.push({ name: "空腹血糖", freq: "每年", due: age >= 20 });
  items.push({ name: "视力检查", freq: "每2年", due: age >= 18 });
  items.push({ name: "口腔检查", freq: "每6个月", due: true });
  // 性别相关
  if (gender === "female") {
    items.push({ name: "乳腺超声/钼靶", freq: age >= 40 ? "每年" : "每2年", due: age >= 35 });
    items.push({ name: "宫颈癌筛查(TCT)", freq: "每3年", due: age >= 21 });
    items.push({ name: "骨密度", freq: "每2年", due: age >= 50 || (profile.conditions?.includes("绝经")) });
  }
  if (gender === "male") {
    items.push({ name: "前列腺特异抗原(PSA)", freq: "每年", due: age >= 50 });
  }
  // 年龄相关
  if (age >= 45) items.push({ name: "结肠镜检查", freq: "每10年", due: true });
  if (age >= 50) items.push({ name: "骨密度", freq: "每2年", due: true });
  if (age >= 60) items.push({ name: "眼底检查", freq: "每年", due: true });
  return items.filter(i => i.due);
}

/**
 * 阶段式健康计划：稳定→增强→长寿护航
 */
export const HEALTH_PHASES = [
  { key: "stabilize", name: "稳定期", icon: "🛡️", desc: "代谢重置、炎症下降、激素对齐", actions: ["建立规律睡眠(7-8h)", "抗炎饮食启动", "每周150min中等强度运动"] },
  { key: "enhance", name: "增强期", icon: "🚀", desc: "体能优化、体成分改善、认知提升", actions: ["加入力量训练", "HIIT间歇", "认知训练+冥想"] },
  { key: "future", name: "长寿护航", icon: "♾️", desc: "预防筛查、生物年龄优化、风险管控", actions: ["年度全面体检", "生物年龄追踪", "压力管理系统"] },
];

/**
 * 就医红线症状（危险信号）
 */
export const RED_FLAGS = [
  { symptom: "突发剧烈胸痛/压迫感", action: "立即拨打急救电话", urgent: true },
  { symptom: "单侧肢体无力/口齿不清", action: "疑似中风，立即就医", urgent: true },
  { symptom: "持续高烧>39.5℃超过3天", action: "尽快就诊", urgent: false },
  { symptom: "不明原因体重骤降>5kg/月", action: "尽快体检排查", urgent: false },
  { symptom: "便血/黑便", action: "消化科就诊", urgent: false },
  { symptom: "持续呼吸困难", action: "急诊", urgent: true },
  { symptom: "头晕伴视物旋转", action: "神经内科", urgent: false },
];

/**
 * 生成健康管家报告（LLM）
 */
export async function generateHealthReport(profile, markers = {}, screenings = []) {
  const evaluated = Object.entries(markers).map(([k, v]) => {
    const e = evaluateMarker(k, v);
    return { key: k, name: BIOMARKERS[k]?.name, value: v, unit: BIOMARKERS[k]?.unit, ...e };
  }).filter(Boolean);

  const issues = evaluated.filter(e => e.status !== "optimal");
  const abnormalCount = issues.length;

  const prompt = `你是服务亿万富豪的**私人保健医生**（管家医疗模式，年费$25,000级别）。用户刚完成健康画像和体检数据录入，请生成一份专业、主动、像给顶级客户做的健康管家报告。

## 用户画像
- 性别: ${profile.gender === "female" ? "女" : "男"}，年龄: ${profile.age}
- 生活习惯: ${profile.habits || "未填写"}
- 病史/家族史: ${profile.history || "无"}
- 目标: ${profile.goal || "长期健康与长寿"}

## 已录入生物标志物 (${evaluated.length}项，异常${abnormalCount}项)
${evaluated.map(e => `- ${e.name}: ${e.value}${e.unit} (${e.msg})`).join("\n")}

## 需做的预防筛查
${screenings.map(s => `- ${s.name} (${s.freq})`).join("\n")}

## 输出要求（严格JSON）
{
  "overview": "总体健康评估（主动预防口吻，40字内）",
  "riskSummary": "风险小结（基于异常项，50字内）",
  "priorities": ["需优先关注的1-3项（如'LDL偏高需降脂'）"],
  "phasePlan": {
    "stabilize": ["稳定期行动1", "行动2"],
    "enhance": ["增强期行动1", "行动2"],
    "future": ["长寿护航行动1", "行动2"]
  },
  "longevity": ["长寿医学建议1（如NAD+前体/运动长寿）", "建议2"],
  "lifestyleRx": ["睡眠处方", "运动处方", "压力管理处方"],
  "monitoring": "建议的复查频率与指标追踪建议",
  "redFlagsNote": "何时必须立即就医的说明"
}`;

  try {
    const r = await callLLM(prompt, { temperature: 0.4 });
    const j = extractJSON(r);
    if (j) return { ...JSON.parse(j), evaluated, issues };
    throw new Error("格式异常");
  } catch (err) {
    console.warn("Health LLM failed:", err);
    return generateFallback(profile, evaluated, issues, screenings);
  }
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}$/);
  if (m) { try { return m[0]; } catch {} }
  return null;
}

function generateFallback(profile, evaluated, issues, screenings) {
  return {
    overview: `录入${evaluated.length}项指标，${issues.length}项需关注。整体以主动预防为主。`,
    riskSummary: issues.length ? `发现${issues.length}项偏离理想范围，建议调整生活方式并复查。` : "各项指标良好，继续保持。",
    priorities: issues.slice(0, 3).map(i => `${i.name}${i.msg}，建议关注`),
    phasePlan: {
      stabilize: HEALTH_PHASES[0].actions,
      enhance: HEALTH_PHASES[1].actions,
      future: HEALTH_PHASES[2].actions,
    },
    longevity: ["规律有氧运动", "充足睡眠", "社交与认知刺激"],
    lifestyleRx: ["睡眠7-8小时", "每周150分钟运动", "正念减压"],
    monitoring: "建议3-6个月复查异常指标。",
    redFlagsNote: "出现胸痛、中风症状立即急救。",
    evaluated, issues,
  };
}
