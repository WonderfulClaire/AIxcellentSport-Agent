// app/agent/foodDB.ts
// 常见食物营养数据库（每 100g 的热量/蛋白/碳水/脂肪）+ 常见份量预设。
// 数值依据《中国食物成分表》第 6 版 / USDA FoodData Central。
// 用途：① 拍照识别无 AI Key 时的兜底手动选择；② 识别结果的可编辑默认值。

export interface FoodItem {
  name: string;            // 标准名（用于搜索匹配）
  aliases: string[];       // 别名/常见叫法
  kcal100: number;         // 每 100g 热量
  protein100: number;      // 每 100g 蛋白 g
  carbs100: number;        // 每 100g 碳水 g
  fat100: number;          // 每 100g 脂肪 g
  cat: "staple" | "protein" | "veg" | "fruit" | "dairy" | "snack" | "drink" | "soup" | "other";
  portions: { label: string; grams: number }[]; // 常见一份的重量
}

export const FOOD_DB: FoodItem[] = [
  // 主食
  { name: "米饭(熟)", aliases: ["米饭", "白饭", "大米饭"], kcal100: 116, protein100: 2.6, carbs100: 25.9, fat100: 0.3, cat: "staple", portions: [{ label: "1碗 150g", grams: 150 }, { label: "1两 50g", grams: 50 }] },
  { name: "糙米饭(熟)", aliases: ["糙米饭", "粗粮饭"], kcal100: 123, protein100: 2.8, carbs100: 25.9, fat100: 1.0, cat: "staple", portions: [{ label: "1碗 150g", grams: 150 }] },
  { name: "馒头", aliases: ["馒头"], kcal100: 223, protein100: 7.0, carbs100: 47.0, fat100: 1.1, cat: "staple", portions: [{ label: "1个 100g", grams: 100 }] },
  { name: "面条(熟)", aliases: ["面条", "面", "汤面"], kcal100: 110, protein100: 4.0, carbs100: 22.0, fat100: 0.6, cat: "staple", portions: [{ label: "1碗 250g", grams: 250 }] },
  { name: "全麦面包", aliases: ["全麦面包", "whole wheat bread"], kcal100: 246, protein100: 8.8, carbs100: 43.0, fat100: 4.5, cat: "staple", portions: [{ label: "2片 80g", grams: 80 }] },
  { name: "白面包", aliases: ["面包", "吐司"], kcal100: 265, protein100: 9.0, carbs100: 49.0, fat100: 3.2, cat: "staple", portions: [{ label: "2片 80g", grams: 80 }] },
  { name: "粥(白米)", aliases: ["粥", "白粥", "米粥"], kcal100: 46, protein100: 1.1, carbs100: 9.9, fat100: 0.3, cat: "staple", portions: [{ label: "1碗 300g", grams: 300 }] },
  { name: "燕麦(干)", aliases: ["燕麦", "oats", "麦片"], kcal100: 367, protein100: 15.0, carbs100: 61.0, fat100: 7.0, cat: "staple", portions: [{ label: "1份 40g", grams: 40 }] },
  { name: "红薯", aliases: ["红薯", "地瓜", "番薯"], kcal100: 99, protein100: 1.1, carbs100: 23.1, fat100: 0.2, cat: "staple", portions: [{ label: "1个 150g", grams: 150 }] },
  { name: "土豆", aliases: ["土豆", "马铃薯", "洋芋"], kcal100: 77, protein100: 2.0, carbs100: 17.2, fat100: 0.2, cat: "staple", portions: [{ label: "1个 150g", grams: 150 }] },

  // 蛋白
  { name: "鸡胸肉(熟)", aliases: ["鸡胸肉", "鸡胸", "鸡肉"], kcal100: 165, protein100: 31.0, carbs100: 0, fat100: 3.6, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "鸡蛋", aliases: ["鸡蛋", "蛋", "水煮蛋"], kcal100: 144, protein100: 13.3, carbs100: 2.8, fat100: 8.8, cat: "protein", portions: [{ label: "1个 50g", grams: 50 }] },
  { name: "牛肉(瘦)", aliases: ["牛肉", "瘦牛肉"], kcal100: 125, protein100: 20.2, carbs100: 1.2, fat100: 4.2, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "猪里脊", aliases: ["猪肉", "里脊", "瘦肉"], kcal100: 155, protein100: 20.2, carbs100: 1.5, fat100: 7.9, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "三文鱼", aliases: ["三文鱼", " salmon"], kcal100: 208, protein100: 20.0, carbs100: 0, fat100: 13.0, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "虾", aliases: ["虾", "基围虾"], kcal100: 93, protein100: 18.6, carbs100: 1.0, fat100: 1.0, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "豆腐", aliases: ["豆腐", "嫩豆腐"], kcal100: 81, protein100: 8.1, carbs100: 3.8, fat100: 3.7, cat: "protein", portions: [{ label: "100g", grams: 100 }] },
  { name: "鸡腿肉(去皮)", aliases: ["鸡腿", "鸡腿肉"], kcal100: 147, protein100: 21.0, carbs100: 0, fat100: 7.0, cat: "protein", portions: [{ label: "100g", grams: 100 }] },

  // 蔬菜
  { name: "西兰花", aliases: ["西兰花", "绿花菜"], kcal100: 34, protein100: 2.8, carbs100: 6.6, fat100: 0.4, cat: "veg", portions: [{ label: "1份 100g", grams: 100 }] },
  { name: "番茄", aliases: ["番茄", "西红柿"], kcal100: 18, protein100: 0.9, carbs100: 3.9, fat100: 0.2, cat: "veg", portions: [{ label: "1个 120g", grams: 120 }] },
  { name: "黄瓜", aliases: ["黄瓜", "青瓜"], kcal100: 15, protein100: 0.7, carbs100: 3.0, fat100: 0.1, cat: "veg", portions: [{ label: "1根 100g", grams: 100 }] },
  { name: "生菜", aliases: ["生菜", "沙拉菜"], kcal100: 15, protein100: 1.4, carbs100: 2.9, fat100: 0.2, cat: "veg", portions: [{ label: "1份 100g", grams: 100 }] },
  { name: "菠菜", aliases: ["菠菜"], kcal100: 23, protein100: 2.6, carbs100: 3.6, fat100: 0.3, cat: "veg", portions: [{ label: "1份 100g", grams: 100 }] },
  { name: "胡萝卜", aliases: ["胡萝卜", "红萝卜"], kcal100: 39, protein100: 1.0, carbs100: 8.8, fat100: 0.2, cat: "veg", portions: [{ label: "1根 80g", grams: 80 }] },

  // 水果
  { name: "苹果", aliases: ["苹果"], kcal100: 52, protein100: 0.2, carbs100: 13.5, fat100: 0.2, cat: "fruit", portions: [{ label: "1个 中 180g", grams: 180 }] },
  { name: "香蕉", aliases: ["香蕉"], kcal100: 89, protein100: 1.1, carbs100: 22.0, fat100: 0.3, cat: "fruit", portions: [{ label: "1根 中 120g", grams: 120 }] },
  { name: "橙子", aliases: ["橙子", "柳橙"], kcal100: 47, protein100: 0.8, carbs100: 11.1, fat100: 0.2, cat: "fruit", portions: [{ label: "1个 中 150g", grams: 150 }] },
  { name: "葡萄", aliases: ["葡萄"], kcal100: 43, protein100: 0.5, carbs100: 10.3, fat100: 0.2, cat: "fruit", portions: [{ label: "1串 150g", grams: 150 }] },
  { name: "西瓜", aliases: ["西瓜"], kcal100: 30, protein100: 0.6, carbs100: 7.2, fat100: 0.1, cat: "fruit", portions: [{ label: "1块 200g", grams: 200 }] },
  { name: "蓝莓", aliases: ["蓝莓", "blueberry"], kcal100: 57, protein100: 0.7, carbs100: 14.5, fat100: 0.3, cat: "fruit", portions: [{ label: "1盒 125g", grams: 125 }] },

  // 乳制品
  { name: "牛奶(全脂)", aliases: ["牛奶", "milk"], kcal100: 54, protein100: 3.0, carbs100: 3.4, fat100: 3.2, cat: "dairy", portions: [{ label: "1杯 250ml", grams: 250 }] },
  { name: "无糖酸奶", aliases: ["酸奶", "yogurt", "希腊酸奶"], kcal100: 59, protein100: 3.5, carbs100: 4.7, fat100: 3.3, cat: "dairy", portions: [{ label: "1杯 200g", grams: 200 }] },
  { name: "豆浆", aliases: ["豆浆", "soy milk"], kcal100: 31, protein100: 3.0, carbs100: 1.2, fat100: 1.6, cat: "dairy", portions: [{ label: "1杯 250ml", grams: 250 }] },

  // 汤 / 其他
  { name: "蔬菜沙拉(无酱)", aliases: ["沙拉", "蔬菜沙拉", "salad"], kcal100: 20, protein100: 1.0, carbs100: 4.0, fat100: 0.2, cat: "veg", portions: [{ label: "1份 150g", grams: 150 }] },

  // 零食饮料
  { name: "美式咖啡(黑)", aliases: ["咖啡", "黑咖啡", "美式"], kcal100: 2, protein100: 0.1, carbs100: 0, fat100: 0, cat: "drink", portions: [{ label: "1杯 240ml", grams: 240 }] },
  { name: "可乐", aliases: ["可乐", "汽水"], kcal100: 43, protein100: 0, carbs100: 10.6, fat100: 0, cat: "drink", portions: [{ label: "1罐 330ml", grams: 330 }] },
  { name: "巧克力", aliases: ["巧克力", "chocolate"], kcal100: 546, protein100: 4.9, carbs100: 61.0, fat100: 29.0, cat: "snack", portions: [{ label: "1块 20g", grams: 20 }] },
  { name: "薯片", aliases: ["薯片", "chips"], kcal100: 548, protein100: 7.0, carbs100: 53.0, fat100: 35.0, cat: "snack", portions: [{ label: "1袋 50g", grams: 50 }] },
  { name: "坚果(混合)", aliases: ["坚果", "nuts", "杏仁"], kcal100: 600, protein100: 18.0, carbs100: 20.0, fat100: 50.0, cat: "snack", portions: [{ label: "1把 25g", grams: 25 }] },
];

const _index = (() => {
  const m = new Map<string, FoodItem>();
  for (const f of FOOD_DB) {
    m.set(f.name.toLowerCase(), f);
    for (const a of f.aliases) m.set(a.toLowerCase(), f);
  }
  return m;
})();

/** 精确名查找 */
export function getFood(name: string): FoodItem | null {
  return _index.get((name || "").toLowerCase()) || null;
}

/** 模糊搜索（名称/别名包含关键字），最多 limit 条 */
export function searchFood(query: string, limit = 12): FoodItem[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return FOOD_DB.slice(0, limit);
  const scored: { f: FoodItem; s: number }[] = [];
  for (const f of FOOD_DB) {
    const hay = (f.name + " " + f.aliases.join(" ")).toLowerCase();
    if (hay.includes(q)) scored.push({ f, s: hay.startsWith(q) ? 0 : 1 });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, limit).map((x) => x.f);
}

/** 按重量(克)算营养 */
export function nutritionForGrams(f: FoodItem, grams: number): { kcal: number; protein: number; carbs: number; fat: number } {
  const k = grams / 100;
  return {
    kcal: Math.round(f.kcal100 * k),
    protein: Math.round(f.protein100 * k * 10) / 10,
    carbs: Math.round(f.carbs100 * k * 10) / 10,
    fat: Math.round(f.fat100 * k * 10) / 10,
  };
}
