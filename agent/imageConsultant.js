// app/agent/imageConsultant.js
// 形象管理引擎：对标名人形象顾问 —— 色彩诊断 + 身型分析 + 场合造型 + 妆容 + 健身变美 + 气质

import { callLLM } from "./coachAgent.js";

/**
 * 四季色彩诊断问卷与判定
 */
export const COLOR_QUESTIONS = [
  { id: "skin", q: "阳光下你的手腕内侧血管偏？", options: [
    { v: "cool", t: "蓝/紫色（冷调）" }, { v: "warm", t: "绿/橄榄色（暖调）" }, { v: "neutral", t: "蓝绿都有（中性）" },
  ]},
  { id: "vein", q: "戴金色还是银色首饰更显气色？", options: [
    { v: "warm", t: "金色更衬" }, { v: "cool", t: "银色更衬" }, { v: "neutral", t: "都还行" },
  ]},
  { id: "eye", q: "你的眼睛和头发整体给人的感觉？", options: [
    { v: "cool", t: "偏黑/深棕，对比强" }, { v: "warm", t: "偏棕/栗，柔和" }, { v: "neutral", t: "介于之间" },
  ]},
  { id: "white", q: "穿纯白还是米白更舒服？", options: [
    { v: "cool", t: "纯白更干净" }, { v: "warm", t: "米白更柔和" }, { v: "neutral", t: "都行" },
  ]},
];

const SEASONS = {
  spring: { name: "春季型 (Spring)", traits: "温暖、明亮、活泼", colors: ["珊瑚橘", "鹅黄", "草绿", "桃粉", "暖白", "金棕"], makeup: ["暖调橘色腮红", "珊瑚色唇膏", "金色系眼影"], avoid: ["冷灰", "藏蓝", "冷粉"] },
  summer: { name: "夏季型 (Summer)", traits: "柔和、清冷、淡雅", colors: ["雾霾蓝", "藕粉", "薄荷绿", "淡紫", "灰白", "玫瑰棕"], makeup: ["裸粉腮红", "玫粉唇膏", "冷调浅棕眼影"], avoid: ["亮橙", "正黄", "强对比"] },
  autumn: { name: "秋季型 (Autumn)", traits: "温暖、浓郁、自然", colors: ["芥末黄", "砖红", "橄榄绿", "焦糖棕", "暖橙", "米色"], makeup: ["暖棕腮红", "砖红/土橘唇膏", "金棕眼影"], avoid: ["冷粉", "冰蓝", "银白"] },
  winter: { name: "冬季型 (Winter)", traits: "冷艳、清晰、高对比", colors: ["正红", "藏蓝", "黑白", "冰蓝", "玫紫", "银灰"], makeup: ["冷粉/玫红腮红", "正红唇膏", "冷灰/银色眼影"], avoid: ["暖橙", "驼色", "柔和米"] },
  neutral: { name: "中性型 (Neutral)", traits: "百搭、平衡", colors: ["大多数颜色都能驾驭", "建议以自己喜欢为主"], makeup: ["中性调最安全", "可冷暖混搭"], avoid: ["极端荧光色"] },
};

export function diagnoseSeason(answers: Record<string, string>) {
  const counts: Record<string, number> = { warm: 0, cool: 0, neutral: 0 };
  Object.values(answers).forEach(v => { if (counts[v] !== undefined) counts[v]++; });
  let dominant = "neutral";
  if (counts.warm > counts.cool && counts.warm > counts.neutral) dominant = "spring"; // 暖→春/秋，进一步看明度
  else if (counts.cool > counts.warm && counts.cool > counts.neutral) dominant = "winter"; // 冷→夏/冬
  else if (counts.warm >= 2) dominant = "autumn";
  else if (counts.cool >= 2) dominant = "summer";
  return SEASONS[dominant];
}

/**
 * 身型分析
 */
export const BODY_SHAPES = {
  hourglass: { name: "沙漏型", traits: "肩臀等宽、腰线明显", do: ["强调腰线（收腰款）", "裹身裙/X版型"], avoid: ["直筒宽松遮腰"] },
  pear: { name: "梨型", traits: "臀宽于肩、下半身丰满", do: ["上亮下暗平衡", "垫肩/A字裙", "V领扩肩"], avoid: ["紧身裤+宽松上衣显头重"] },
  apple: { name: "苹果型", traits: "腰腹圆润、四肢较细", do: ["高腰线拉长", "V领显瘦", "直筒/帝国腰"], avoid: ["紧身圆领裹腰"] },
  rectangle: { name: "矩形/直板", traits: "肩腰臀宽度相近", do: ["制造曲线（荷叶/褶皱）", "腰带分割", "层叠穿搭"], avoid: ["完全直筒无层次"] },
  inverted: { name: "倒三角", traits: "肩宽于臀、运动感", do: ["下装扩容（A字/阔腿）", "柔和领口", "简约下装"], avoid: ["垫肩/夸张上装"] },
};

export function diagnoseBodyShape(shoulders: string, waist: string, hips: string) {
  // 简化判定
  if (waist === "defined" && (shoulders === "balanced" || hips === "balanced")) return BODY_SHAPES.hourglass;
  if (hips === "wider") return BODY_SHAPES.pear;
  if (shoulders === "wider") return BODY_SHAPES.inverted;
  if (waist === "round") return BODY_SHAPES.apple;
  return BODY_SHAPES.rectangle;
}

/**
 * 生成形象提升方案（LLM）
 */
export async function generateImagePlan(profile) {
  const prompt = `你是服务一线明星和名人的**顶级形象顾问**（曾操刀红毯造型、杂志大片）。
基于用户画像，生成一份"素人变明星"的形象提升方案。

## 用户画像
- 性别: ${profile.gender === "female" ? "女" : "男"}
- 年龄: ${profile.age}
- 风格偏好: ${profile.style || "自然/通勤"}
- 主要诉求: ${profile.concern || "提升气质、更上镜"}
- 场合需求: ${profile.occasion || "日常/职场"}

## 输出要求（严格JSON）
{
  "summary": "形象诊断一句话（鼓励+专业，40字内）",
  "colorAdvice": "基于通用建议的色彩策略（不强行诊断，给实用配色）",
  "bodyAdvice": "扬长避短穿搭原则（3条）",
  "occasionStyling": {
    "职场": "通勤穿搭要点",
    "约会": "约会/社交穿搭要点",
    "日常": "日常舒适又有型",
    "重要场合": "红毯/演讲/面试等高分造型"
  },
  "capsuleWardrobe": ["胶囊衣橱必备单品1", "单品2", "单品3", "单品4", "单品5"],
  "makeupRoutine": ["妆容步骤1（如底妆轻薄）", "步骤2", "步骤3", "步骤4"],
  "beautyFitness": ["瘦脸/紧致: 动作或习惯1", "体态挺拔: 习惯2", "局部塑形: 建议3"],
  "confidenceTips": ["气质提升1（体态/眼神/语速）", "气质提升2"],
  "quickWins": ["立竿见影的小改变1", "小改变2"]
}`;

  try {
    const r = await callLLM(prompt, { temperature: 0.6 });
    const j = extractJSON(r);
    if (j) return JSON.parse(j);
    throw new Error("格式异常");
  } catch (err) {
    console.warn("Image LLM failed:", err);
    return {
      summary: "每个人都有独特魅力，科学造型能放大你的优势。",
      colorAdvice: "冷暖中立皆可，建议选衬肤色的低饱和色系。",
      bodyAdvice: ["强调腰线或制造曲线", "上下装明暗平衡", "合身比潮流更重要"],
      occasionStyling: { 职场: "合身西装/衬衫+直筒裤", 约会: "柔和色+适度露肤", 日常: "简约层次感", 重要场合: "挺括面料+点睛配饰" },
      capsuleWardrobe: ["白衬衫", "深色直筒裤", "质感西装外套", "小黑裙/修身衫", "舒适乐福鞋"],
      makeupRoutine: ["轻薄底妆", "眉形修整", "自然唇色", "睫毛夹翘"],
      beautyFitness: ["每天5分钟面部按摩消水肿", "靠墙站姿挺拔体态", "规律有氧紧致全身"],
      confidenceTips: ["抬头挺胸、目光平视", "放慢语速、清晰表达"],
      quickWins: ["换一款适合的发型", "整理衣橱只留合身款"],
    };
  }
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}$/);
  if (m) { try { return m[0]; } catch {} }
  return null;
}
