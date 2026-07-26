// app/agent/foodVision.ts
// 拍照识别食物：把照片压缩后发给「已配置的视觉模型」(OpenAI 兼容 /chat/completions 多模态)，
// 返回结构化营养估算。未配置 LLM 或模型非视觉 → 返回 null，由调用方走「手动选择」兜底。

import { callLLM } from "./coachAgent";
import { getLLMConfig } from "./config";

export interface FoodResult {
  name: string;
  portion_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number; // 0-1
}

const PROMPT = `你是一个食物营养识别专家。请识别这张图片里的这道菜/这份食物，估算它的份量(克)与营养。
只输出一行严格 JSON，不要任何解释、不要 markdown 代码块：
{"name":"食物中文名","portion_g":整数,"kcal":整数,"protein_g":数字,"carbs_g":数字,"fat_g":数字,"confidence":0到1的小数}
若图片里看不出明确食物，返回 {"name":"未知","portion_g":0,"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"confidence":0}。`;

/** 把图片压缩到合适尺寸/体积，返回 jpeg dataURL（控制发送给模型的 payload 大小） */
export function compressImage(file: File, maxDim = 768, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

function extractJson(text: string): any | null {
  if (!text) return null;
  // 去掉可能的 ```json ... ``` 包裹
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // 取第一个 { ... } 块
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  try {
    return JSON.parse(t.slice(s, e + 1));
  } catch {
    return null;
  }
}

/**
 * 识别食物照片。
 * @returns FoodResult 或 null（无 Key / 模型不支持视觉 / 解析失败 → 走兜底）。
 */
export async function recognizeFoodPhoto(file: File): Promise<FoodResult | null> {
  const cfg = getLLMConfig();
  if (!cfg) return null;
  let dataUrl: string;
  try {
    dataUrl = await compressImage(file);
  } catch {
    return null;
  }
  const messages = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: dataUrl } },
        { type: "text", text: PROMPT },
      ],
    },
  ];
  let raw: string | null = null;
  try {
    raw = await callLLM(messages as any, { ...cfg, timeoutMs: 15000 });
  } catch {
    return null;
  }
  const j = extractJson(raw || "");
  if (!j || !j.name || j.name === "未知" || !j.kcal) return null;
  const num = (v: any, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
  return {
    name: String(j.name).slice(0, 40),
    portion_g: Math.max(0, Math.round(num(j.portion_g))),
    kcal: Math.max(0, Math.round(num(j.kcal))),
    protein_g: Math.max(0, num(j.protein_g)),
    carbs_g: Math.max(0, num(j.carbs_g)),
    fat_g: Math.max(0, num(j.fat_g)),
    confidence: Math.min(1, Math.max(0, num(j.confidence, 0.5))),
  };
}
