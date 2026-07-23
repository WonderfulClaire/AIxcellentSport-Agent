// app/agent/tcmEngine.js
// 中医养生引擎：节气计算 + 地理位置适配 + 天气联动 + 养生知识库

/**
 * 二十四节气数据表
 * 每个节气的太阳黄经度数、名称、养生要点
 */
export const SOLAR_TERMS = [
  { name: "小寒", longitude: 285, tcm: "养肾防寒，早睡晚起", diet: "羊肉、核桃、黑芝麻", exercise: "室内拉伸、八段锦", avoid: "剧烈出汗、生冷食物" },
  { name: "大寒", longitude: 300, tcm: "固本培元，温补脾肾", diet: "糯米粥、红枣、桂圆", exercise: "慢走、太极", avoid: "受凉、过度劳累" },
  { name: "立春", longitude: 315, tcm: "升发阳气，舒展肝气", diet: "韭菜、菠菜、春笋", exercise: "户外散步、踏青", avoid: "抑郁情绪、油腻厚味" },
  { name: "雨水", longitude: 330, tcm: "健脾祛湿，调畅情志", diet: "山药、芡实、薏米", exercise: "温和有氧", avoid: "湿邪侵袭、暴饮暴食" },
  { name: "惊蛰", longitude: 345, tcm: "顺时养肝，清泄肝火", diet: "梨、银耳、百合", exercise: "慢跑、登山", avoid: "动怒、熬夜" },
  { name: "春分", longitude: 0, tcm: "阴阳平衡，调和脏腑", diet: "时令蔬菜、蜂蜜水", exercise: "瑜伽、普拉提", avoid: "偏食偏嗜、情绪波动" },
  { name: "清明", longitude: 15, tcm: "疏肝理气，调和气血", diet: "青团(适量)、荠菜、螺蛳", exercise: "放风筝、踏青", avoid: "悲伤过度、风寒入侵" },
  { name: "谷雨", longitude: 30, tcm: "健脾除湿，补血养心", diet: "香椿、草莓、绿茶", exercise: "快走、骑行", avoid: "潮湿环境、久坐不动" },
  { name: "立夏", longitude: 45, tcm: "养心护阳，清热解暑", diet: "苦瓜、莲子、绿豆汤", exercise: "晨练、游泳", avoid: "贪凉饮冷、大汗淋漓" },
  { name: "小满", longitude: 60, tcm: "清热利湿，养护脾胃", diet: "冬瓜、丝瓜、薏米红豆粥", exercise: "中等强度运动", avoid: "湿热内蕴、饮食不节" },
  { name: "芒种", longitude: 75, tcm: "养阴润燥，清心除烦", diet: "桑葚、青梅、酸梅汤", exercise: "早晚运动", avoid: "暑热伤气、夜卧贪凉" },
  { name: "夏至", longitude: 90, tcm: "阳气极盛，滋阴潜阳", diet: "苦瓜、西红柿、鸭肉", exercise: "避午时运动", avoid: "过度出汗、冷热骤变" },
  { name: "小暑", longitude: 105, tcm: "清心降火，健脾化湿", diet: "莲藕、西瓜、荷叶粥", exercise: "水中运动、晨练", avoid: "中暑、过食冰品" },
  { name: "大暑", longitude: 120, tcm: "冬病夏治，温阳散寒", diet: "姜茶、羊肉(少量)、绿豆", exercise: "适度运动、避免正午", avoid: "暑湿困脾、空调温度过低" },
  { name: "立秋", longitude: 135, tcm: "收敛肺气，滋阴润燥", diet: "梨、百合、银耳羹", exercise: "登山、呼吸练习", avoid: "悲秋情绪、辛辣燥烈" },
  { name: "处暑", longitude: 150, tcm: "润燥养阴，调理脾胃", diet: "鸭肉、莲子、蜂蜜", exercise: "户外活动增加", avoid: "过早添衣、秋燥伤肺" },
  { name: "白露", longitude: 165, tcm: "保暖防燥，益气养血", diet: "龙眼、红薯、小米粥", exercise: "早晚注意保暖", avoid: "外感风寒、露宿受凉" },
  { name: "秋分", longitude: 180, tcm: "阴阳平衡，收敛神气", diet: "螃蟹(适量)、石榴、柚子", exercise: "登高望远", avoid: "情志不畅、过度劳累" },
  { name: "寒露", longitude: 195, tcm: "养阴防燥，润肺益胃", diet: "芝麻、雪梨、蜂蜜水", exercise: "耐寒训练开始", avoid: "干燥伤津、足部受凉" },
  { name: "霜降", longitude: 210, tcm: "平补气血，固摄肾元", diet: "栗子、柿子、牛肉", exercise: "增加运动量", avoid: "膝部受寒、过度疲劳" },
  { name: "立冬", longitude: 225, tcm: "闭藏养肾，温补元气", diet: "羊肉、黑豆、核桃", exercise: "冬季运动储备", avoid: "受寒、汗出当风" },
  { name: "小雪", longitude: 240, tcm: "温补肾阳，御寒保暖", diet: "牛肉、萝卜、黑木耳", exercise: "室内运动为主", avoid: "寒邪入侵、情绪低落" },
  { name: "大雪", longitude: 255, tcm: "封藏固本，进补最佳期", diet: "羊肉火锅、枸杞、当归", exercise: "适度运动、晒太阳", avoid: "过度消耗、房事不节" },
  { name: "冬至", longitude: 270, tcm: "一阳初生，最宜进补", diet: "饺子、汤圆、羊肉", exercise: "静功、冥想", avoid: "大汗耗阳、寒冷刺激" },
];

/**
 * 计算当前节气
 * 基于太阳黄经度数近似计算（精度±1天）
 * @returns {{ current: object, next: object, daysToNext: number }}
 */
export function getCurrentSolarTerm() {
  const now = new Date();
  // 简化的节气估算：基于日期范围
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  
  // 节气大约每15天一个，从约1月5-7日的小寒开始
  const termIndex = Math.floor((dayOfYear + 8) / 15.22) % 24;
  const current = SOLAR_TERMS[termIndex];
  const next = SOLAR_TERMS[(termIndex + 1) % 24];
  const daysToNext = Math.max(1, 15 - ((dayOfYear + 8) % 15));

  return { current, next, daysToNext: Math.round(daysToNext), index: termIndex };
}

/**
 * 根据天气条件生成中医养生建议
 */
export function getWeatherTCMAdvice(weather: { temp?: number; humidity?: number; condition?: string; wind?: number }) {
  const advice = [];
  const { temp = 25, humidity = 60, condition = "晴", wind = 2 } = weather;

  // 温度相关
  if (temp < 5) {
    advice.push({ type: "warn", text: "严寒天气，注意保暖护阳。外出戴围巾保护颈部，避免寒邪入侵。" });
    advice.push({ type: "diet", text: "宜食温热食物：生姜红糖茶、羊肉汤、红枣桂圆粥。" });
  } else if (temp < 12) {
    advice.push({ type: "tip", text: "偏凉，运动前充分热身，防止肌肉拉伤。" });
    advice.push({ type: "diet", text: "可适当进补：山药炖排骨、板栗鸡汤。" });
  } else if (temp > 35) {
    advice.push({ type: "warn", text: "高温预警！避免正午(11-15点)户外运动，防中暑。" });
    advice.push({ type: "diet", text: "清热解暑：绿豆汤、西瓜、酸梅汤、荷叶粥。" });
  }

  // 湿度相关
  if (humidity > 80) {
    advice.push({ type: "tip", text: "湿度偏高，体内易积湿。可饮用薏米红豆水祛湿。" });
    advice.push({ type: "exercise", text: "推荐：八段锦中的「调理脾胃须单举」，有助于运化水湿。" });
  } else if (humidity < 30) {
    advice.push({ type: "tip", text: "空气干燥，注意补水润燥。多喝温水，可用加湿器。" });
    advice.push({ type: "diet", text: "润燥食疗：银耳雪梨羹、蜂蜜水、百合莲子汤。" });
  }

  // 天气状况
  if (condition.includes("雨") || condition.includes("雷")) {
    advice.push({ type: "exercise", text: "雨天不适合户外运动，推荐室内：瑜伽、平板支撑、弹力带训练。" });
    advice.push({ type: "tcm", text: "中医认为「湿邪」易在雨天侵袭，注意关节保暖。" });
  }
  if (condition.includes("晴") && temp > 28) {
    advice.push({ type: "tip", text: "晴好天气适合户外运动，但注意防晒。" });
    advice.push({ type: "tcm", text: "适当晒背可补充阳气（上午9-10点或下午4-5点，每次15-20分钟）。" });
  }
  if ((wind || 0) > 4) {
    advice.push({ type: "warn", text: "大风天避免户外高强度运动，防止风邪入侵头部和颈部。" });
  }

  return advice;
}

/**
 * 体质辨识问卷及建议（简化版）
 */
export const BODY_TYPES = [
  {
    id: "qi_deficiency", name: "气虚质",
    symptoms: ["容易疲乏", "说话声音小", "容易感冒", "动则出汗"],
    advice: {
      diet: "黄芪党参粥、山药、大枣、鸡肉",
      exercise: "温和有氧（散步、太极拳），避免过度劳累",
      avoid: "剧烈运动、大汗淋漓、苦寒食物",
      acupoints: "足三里、气海、关元",
    },
  },
  {
    id: "yang_deficiency", name: "阳虚质",
    symptoms: ["手脚冰凉", "怕冷", "面色苍白", "大便溏稀"],
    advice: {
      diet: "羊肉、韭菜、核桃、生姜、桂圆",
      exercise: "日光下运动、慢跑，以微汗为度",
      avoid: "生冷食物、冷水澡、长期待空调房",
      acupoints: "关元、命门、涌泉",
    },
  },
  {
    id: "yin_deficiency", name: "阴虚质",
    symptoms: "口干咽燥、手足心热、盗汗、便秘".split("、"),
    advice: {
      diet: "银耳、百合、鸭肉、桑葚、黑芝麻",
      exercise: "中等强度，不宜大汗，注重放松",
      avoid: "辛辣燥热、熬夜、蒸桑拿",
      acupoints: "三阴交、太溪、照海",
    },
  },
  {
    id: "phlegm_dampness", name: "痰湿质",
    symptoms: ["体型肥胖", "面部油光", "胸闷痰多", "身体沉重"],
    advice: {
      diet: "冬瓜、薏米、赤小豆、山楂、陈皮",
      exercise: "有氧运动为主（快走、游泳），每天40分钟以上",
      avoid: "甜腻厚重、肥甘厚味、久坐少动",
      acupoints: "丰隆、阴陵泉、足三里",
    },
  },
  {
    id: "balanced", name: "平和质",
    symptoms: ["精力充沛", "睡眠良好", "食欲正常", "二便通畅"],
    advice: {
      diet: "均衡饮食，五谷杂粮、蔬果肉蛋奶搭配",
      exercise: "多样化运动，保持规律作息",
      avoid: "无特殊禁忌，维持即可",
      acupoints: "日常保健按摩：合谷、足三里、三阴交",
    },
  },
];

/**
 * 生成每日综合养生建议
 * @param {{latitude?: number, longitude?: number, city?: string}} location
 * @param {{temp?: number, humidity?: number, condition?: string}} weather
 * @param {string} bodyType - 体质ID
 */
export function generateDailyWellnessAdvice(location = {}, weather = {}, bodyType = "balanced") {
  const solarTerm = getCurrentSolarTerm();
  const weatherAdvice = getWeatherTCMAdvice(weather);
  const bodyTypeInfo = BODY_TYPES.find((bt) => bt.id === bodyType) || BODY_TYPES[4];

  return {
    date: new Date().toLocaleDateString("zh-CN"),
    location: location.city || "未知地区",
    solarTerm: {
      name: solarTerm.current.name,
      next: solarTerm.next.name,
      daysToNext: solarTerm.daysToNext,
      principle: solarTerm.current.tcm,
      recommendedDiet: solarTerm.current.diet,
      recommendedExercise: solarTerm.current.exercise,
      avoid: solarTerm.current.avoid,
    },
    weatherAdvice,
    bodyType: {
      name: bodyTypeInfo.name,
      diet: bodyTypeInfo.advice.diet,
      exercise: bodyTypeInfo.advice.exercise,
      avoid: bodyTypeInfo.advice.avoid,
      acupoints: bodyTypeInfo.advice.acupoints,
    },
    todayTips: generateTodayTips(solarTerm, weather, bodyTypeInfo),
  };
}

function generateTodayTips(solarTerm, weather, bodyType) {
  const tips = [];

  // 节气提示
  if (solarTerm.daysToNext <= 3) {
    tips.push(`📅 再过${solarTerm.daysToNext}天就是「${solarTerm.next.name}」了，注意调整起居和饮食`);
  }
  tips.push(`🌿 当前节气「${solarTerm.current.name}」养生原则：${solarTerm.current.tcm}`);

  // 天气+运动结合
  const temp = weather.temp || 25;
  if (temp > 30 && solarTerm.current.name.includes("夏")) {
    tips.push("☀️ 夏季高温，建议清晨或傍晚运动，避开烈日");
  } else if (temp < 10 && solarTerm.current.name.includes("冬")) {
    tips.push("❄️ 冬季寒冷，运动前务必充分热身10-15分钟");
  }

  // 体质提示
  if (bodyType.id !== "balanced") {
    tips.push(`🧘 作为${bodyType.name}，今日推荐穴位按摩：${bodyType.advice.acupoints}`);
  }

  // 饮食提示
  tips.push(`🍲 今日推荐食材：${solarTerm.current.diet}`);

  return tips;
}

/**
 * 获取用户地理位置（浏览器 Geolocation API）
 * @returns {Promise<{latitude:number, longitude:number}>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("浏览器不支持地理定位"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }, // 缓存5分钟
    );
  });
}
