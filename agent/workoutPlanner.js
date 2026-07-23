/**
 * workoutPlanner.js — 训练计划系统引擎
 * 对标 Codex: A/B分化 + 热身 + 拉伸 + 动作卡片增强 + 自动生成
 */

// ═══════════════════════════════════════════════════
// 1. 训练模板库（对标截图4的 A/B 计划）
// ═══════════════════════════════════════════════════

const WORKOUT_TEMPLATES = {
  // ── 训练日 A：下肢+核心主导 ──
  dayA: {
    name: "训练日 A",
    focus: "下肢 · 臀部 · 核心",
    difficulty: "中",
    duration: "45-55 min",
    exercises: [
      { id: "bulgarian_squat", name: "保加利亚深蹲", sets: 4, reps: "8-15", rest: "90s", level: "高", target: ["臀大肌", "股四头肌"], benefit: "单侧下肢王牌动作，同时提升平衡与臀部激活。比传统深蹲更安全，对膝盖压力更小。", muscles: "臀部 · 大腿前侧 · 核心稳定" },
      { id: "slow_pushup", name: "慢速俯卧撑", sets: 3, reps: "6-12", rest: "60s", level: "中", target: ["胸大肌", "肱三头肌", "前锯肌"], benefit: "慢速离心控制最大化肌肉时间张力，比快速俯卧撑刺激更深。", muscles: "胸部 · 三头肌 · 肩前束" },
      { id: "glute_bridge", name: "臀桥 / 臀推", sets: 3, reps: "12-18", rest: "60s", level: "初", target: ["臀大肌", "腘绳肌"], benefit: "激活臀部的基础动作，适合作为臀部训练的热身或收尾。", muscles: "臀部 · 大腿后侧" },
      { id: "pike_pushup", name: "Pike 俯卧撑", sets: 3, reps: "8-15", rest: "60s", level: "中", target: ["三角肌前束", "胸大肌上胸", "核心"], benefit: "倒V姿势将更多负荷转移到肩部和上胸，是自重练肩的王牌。", muscles: "肩部 · 上胸 · 核心" },
      { id: "knee_pushup", name: "跪姿俯卧撑", sets: 3, reps: "10-20", rest: "45s", level: "初", target: ["胸大肌", "肱三头肌"], benefit: "标准俯卧撑降阶，适合新手建立基础力量。", muscles: "胸部 · 三头肌" },
      { id: "shoulder_plank", name: "肩部铰链平板支撑", sets: 3, reps: "30-45s", rest: "45s", level: "中", target: ["核心", "肩袖", "下背"], benefit: "结合了平板支撑和肩部稳定性训练，一次解决两个问题。", muscles: "核心整体 · 肩袖 · 下背" },
      { id: "frog_glute", name: "蛙式臀桥", sets: 3, reps: "12-16", rest: "45s", level: "初", target: ["臀大肌外展", "髋外旋肌群"], benefit: "脚心相对的姿势强化臀部外侧和髋外旋能力，改善骨盆稳定性。", muscles: "臀部外侧 · 髋外旋" },
    ],
    stretches: [
      { name: "胸门阔肌等胸廓拉伸", duration: "30-45s", target: "胸廓前侧 · 肩内旋" },
      { name: "鹅颈摸脚趾拉伸", duration: "30-45s", target: "腘绳肌 · 下背" },
      { name: "4字臀屈拉伸", duration: "每侧30-45s", target: "臀部 · 髋外旋" },
      { name: "圆绳肌站姿拉伸", duration: "每侧30s", target: "大腿后侧" },
    ],
  },

  // ── 训练日 B：上肢+背部主导 ──
  dayB: {
    name: "训练日 B",
    focus: "上肢 · 背部 · 肩部",
    difficulty: "中",
    duration: "45-55 min",
    exercises: [
      { id: "pushup", name: "偶数撑(标准俯卧撑)", sets: 4, reps: "8-15", rest: "60-90s", level: "中", target: ["胸大肌", "肱三头肌", "前锯肌"], benefit: "上肢推类动作之王，同时锻炼胸、三头、前锯肌和核心抗伸展。", muscles: "胸部 · 三头肌 · 前锯肌 · 核心" },
      { id: "rowing", name: "背部自身身划船", sets: 3, reps: "10-15", rest: "60s", level: "中", target: ["背阔肌", "菱形肌", "斜方肌中下"], benefit: "改善圆肩驼背的核心动作，让背部变厚实、体态更挺拔。", muscles: "背阔肌 · 菱形肌 · 斜方肌" },
      { id: "lateral_raise", name: "侧平举(Y-T-W)", sets: 3, reps: "12-20", rest: "45s", level: "初", target: ["三角肌中束"], benefit: "打造肩宽的关键动作，Y-T-W 变式全面刺激三角肌三个束。", muscles: "三角肌中束 · 肩袖" },
      { id: "plank", name: "平板支撑", sets: 3, reps: "30-60s", rest: "45s", level: "初", target: ["腹直肌", "腹横肌", "核心"], benefit: "核心抗伸展能力的黄金标准，提升整体躯干稳定性。", muscles: "腹直肌 · 腹横肌 · 腰方肌" },
      { id: "reverse_lunge", name: "反向弓步", sets: 3, reps: "10-16/每侧", rest: "60s", level: "中", target: ["臀大肌", "股四头肌", "腘绳肌"], benefit: "比向前弓步更友好膝盖，同时强化臀部和平衡能力。", muscles: "臀部 · 大腿前后侧" },
      { id: "glute_kickback", name: "臀部外展/跪姿后踢", sets: 3, reps: "15-25/每侧", rest: "45s", level: "初", target: ["臀中肌", "臀大肌"], benefit: "孤立刺激臀部外侧，改善臀部凹陷和骨盆侧倾。", muscles: "臀中肌 · 臀大肌" },
    ],
    stretches: [
      { name: "背阔肌拉伸(门框)", duration: "每侧30-45s", target: "背阔肌 · 肱三头肌长头" },
      { name: "胸大肌拉伸(墙角)", duration: "30-45s", target: "胸大肌 · 胸小肌 · 肩前束" },
      { name: "颈部侧屈拉伸", duration: "每侧20s", target: "胸锁乳突肌 · 斜角肌" },
      { name: "手腕/前臂拉伸", duration: "30s", target: "前臂屈伸肌群" },
    ],
  },
};

// ═══════════════════════════════════════════════════
// 2. 热身流程（对标截图3）
// ═══════════════════════════════════════════════════

const WARMUP_ROUTINE = [
  {
    name: "手指环绕",
    duration: "1分钟",
    target: "手指灵活性",
    description: "双手十指交叉，先顺时针旋转10圈，再逆时针10圈。",
    benefit: "唤醒手部小肌群，为支撑类动作做准备。",
    category: "关节活动",
  },
  {
    name: "手腕拉伸",
    duration: "1分钟",
    target: "腕关节",
    description: "一手伸直掌心向前，另一手轻拉手指向后；然后掌心向内反向拉。",
    benefit: "预防手腕疼痛（尤其俯卧撑/平板支撑时）。",
    category: "关节活动",
  },
  {
    name: "肩胛骨回缩",
    duration: "1分钟",
    target: "肩胛骨 · 上背",
    description: "坐或站，双肩向后夹紧，想象两片肩胛骨中间能夹一支笔，保持5秒后放松，重复10次。",
    benefit: "激活菱形肌和斜方肌中下束，改善圆肩，为上肢推拉做准备。",
    category: "激活",
  },
  {
    name: "徒手臂桥",
    duration: "2×8-12",
    target: "臀大肌 · 腘绳肌",
    description: "仰卧屈膝，脚掌着地，臀部发力抬起至大腿与身体成一直线，顶峰收缩1秒后缓慢放下。",
    benefit: "激活臀部主发力肌群，让后续深蹲/弓步时臀部更好参与。",
    category: "激活",
  },
  {
    name: "分腿蹲空动作",
    duration: "每侧8次",
    target: "髋关节 · 大腿内侧",
    description: "双脚宽于肩站立，一侧腿屈膝下蹲，另一侧腿伸直，感受拉伸感后回正，换侧。",
    benefit: "动态打开髋关节，激活内收肌，预防弓步时腹股沟拉伤。",
    category: "动态拉伸",
  },
  {
    name: "开合跳(可选)",
    duration: "30秒",
    target: "全身 · 心率",
    description: "站姿跳起同时双脚分开双手头顶击掌，落地再跳回。",
    benefit: "快速提升心率进入运动状态，适合想加大强度的人。",
    category: "心肺激活",
  },
];

// ═══════════════════════════════════════════════════
// 3. 拉伸恢复库
// ═══════════════════════════════════════════════════

const STRETCH_LIBRARY = [
  // 下半身
  { name: "站立前屈", duration: "30-60s", muscles: "腘绳肌 · 下背 · 小腿", category: "下半身" },
  { name: "鸽子式", duration: "每侧45-60s", muscles: "臀部深层 · 髂腰肌 · 腰方肌", category: "下半身" },
  { name: "蝴蝶式", duration: "60s", muscles: "大腿内收肌 · 腹股沟", category: "下半身" },
  { name: "四足猫牛式", duration: "10次慢速", muscles: "脊柱全长 · 核心整体", category: "脊柱" },
  { name: "婴儿式", duration: "30-60s", muscles: "下背 · 脊柱伸肌 · 肩", category: "全身放松" },
  // 上半身
  { name: "门框胸拉伸", duration: "每侧30-45s", muscles: "胸大肌 · 胸小肌 · 肩前束", category: "上半身" },
  { name: "颈侧屈", duration: "每侧20s", muscles: "胸锁乳突肌 · 斜角肌", category: "颈部" },
  { name: "颈部旋转", duration: "每侧20s", muscles: "胸锁乳突肌 · 斜角肌", category: "颈部" },
  { name: "背后拉伸(毛巾)", duration: "每侧30s", muscles: "背阔肌 · 三头肌长头 · 大圆肌", category: "上半身" },
  { name: "手腕屈伸拉伸", duration: "各30s", muscles: "前臂屈肌 · 前臂伸肌", category: "手臂" },
];

// ═══════════════════════════════════════════════════
// 4. 动作详情增强数据（对标截图4的动作卡片）
// ═══════════════════════════════════════════════════

const EXERCISE_DETAILS = {
  // 深蹲系
  squat: {
    aliases: ["深蹲", "徒手深蹲", "自重深蹲"],
    level: "初",
    target: ["股四头肌", "臀大肌", "核心"],
    benefit: "下肢训练之王，同时锻炼腿部力量、臀部激活和核心稳定。日常功能性极强——坐下站起的模式每天都在重复。",
    muscles: "大腿前侧 · 臀部 · 核心",
    tips: ["膝盖始终朝向脚尖方向", "下蹲时臀部先向后坐", "腰背保持自然生理弧度"],
    commonMistakes: ["膝盖内扣", "过度前倾上身", "踮脚尖"],
    videoQuery: "proper squat form technique",
  },
  lunge: {
    aliases: ["弓步", "箭步蹲", "交替弓步"],
    level: "中",
    target: ["股四头肌", "臀大肌", "腘绳肌"],
    benefit: "单侧腿部力量的最佳训练之一，同时挑战平衡能力和核心抗旋转。对改善左右侧不平衡特别有效。",
    muscles: "大腿前后侧 · 臀部 · 核心",
    tips: ["前膝不超过脚尖太多", "躯干保持直立", "步距要够大"],
    commonMistakes: ["步距太窄导致膝盖压力大", "上身前倾过多", "后膝触地砸地"],
    videoQuery: "proper lunge form technique",
  },
  bulgarian_squat: {
    aliases: ["保加利亚分腿蹲", "保加利亚深蹲", "Bulgarian Split Squat"],
    level: "高",
    target: ["臀大肌", "股四头肌"],
    benefit: "单侧下肢王牌动作，臀部激活效果优于任何双侧深蹲变式。同时大幅提升平衡和髋关节稳定性。",
    muscles: "臀部 · 大腿前侧 · 核心稳定",
    tips: ["后脚背放在凳面上", "前膝微向外展", "躯干尽量直立"],
    commonMistakes: ["后脚踩得太低", "前膝内扣", "上半身过度前倾"],
    videoQuery: "bulgarian split squat form guide",
  },
  // 俯卧撑系
  pushup: {
    aliases: ["俯卧撑", "标准俯卧撑", "Push-up"],
    level: "中",
    target: ["胸大肌", "肱三头肌", "前锯肌", "核心"],
    benefit: "上肢推力训练的黄金动作，同时锻炼胸、三头、前锯肌和核心抗伸展。无需器械随时随地可做。",
    muscles: "胸部 · 三头肌 · 前锯肌 · 核心",
    tips: ["身体从头到脚成一条直线", "手肘约45°角（不是90°外展）", " chest 先着地不是下巴"],
    commonMistakes: ["塌腰", "屁股翘太高", "手肘完全外展90°(伤肩膀)"],
    videoQuery: "perfect pushup form technique",
  },
  knee_pushup: {
    aliases: ["跪姿俯卧撑", "女生俯卧撑", "降阶俯卧撑"],
    level: "初",
    target: ["胸大肌", "肱三头肌"],
    benefit: "标准俯卧撑的安全降阶版本，适合新手建立基础上肢力量后再进阶到完整版。",
    muscles: "胸部 · 三头肌",
    tips: ["膝盖着地但髋部不要下沉", "保持核心收紧", "缓慢下降控制节奏"],
    commonMistakes: ["髋部塌下去像蛇一样", "下降太快没有控制"],
    videoQuery: "knee pushup form for beginners",
  },
  pike_pushup: {
    aliases: ["Pike俯卧撑", "倒V俯卧撑", "下犬式俯卧撑", "Pike Push-up"],
    level: "中",
    target: ["三角肌前/中束", "胸大肌上胸", "核心"],
    benefit: "倒V姿势将重心前移，更多负荷落在肩部。是自重练肩的首选动作，同时对上胸有很好的刺激。",
    muscles: "肩部 · 上胸 · 核心",
    tips: ["臀部抬高形成倒V", "手肘微微内收(不是完全外展)", "额头接近地面而非下巴"],
    commonMistakes: ["臀部不够高(变成普通俯卧撑)", "手肘过度外展伤肩"],
    videoQuery: "pike pushup shoulder exercise form",
  },
  // 核心系
  plank: {
    aliases: ["平板支撑", "Plank", "直板支撑"],
    level: "初",
    target: ["腹直肌", "腹横肌", "腰方肌", "核心"],
    benefit: "核心抗伸展能力的黄金标准。看似简单实则考验全身协调，是所有复杂动作的基础。",
    muscles: "腹直肌 · 腹横肌 · 腰方肌 · 前锯肌",
    tips: ["肘部在肩膀正下方", "收紧臀部和大腿", "头颈自然延伸不要低头"],
    commonMistakes: ["塌腰(最常见!)", "屁股翘太高", "憋气"],
    videoQuery: "perfect plank form core exercise",
  },
  side_plank: {
    aliases: ["侧平板", "侧支撑", "Side Plank"],
    level: "中",
    target: ["腹内外斜肌", "腰方肌", "臀中肌"],
    benefit: "唯一能有效孤立训练侧腹核心的自重动作。对改善腰部线条和脊柱侧向稳定性至关重要。",
    muscles: "侧腹 · 腰方肌 · 臀中肌",
    tips: ["身体侧面成一条直线", "髋部不要前后倾斜", "可以叠腿降低难度"],
    commonMistakes: ["髋部下沉", "用肩膀撑而不是核心"],
    videoQuery: "side plank oblique exercise form",
  },
  // 其他
  glute_bridge: {
    aliases: ["臀桥", "Glute Bridge", "臀推"],
    level: "初",
    target: ["臀大肌", "腘绳肌"],
    benefit: "激活臀部的基础且高效动作。适合作为臀部训练的热身或高次数收尾泵血。",
    muscles: "臀部 · 大腿后侧",
    tips: ["顶峰收缩停顿1秒", "用臀部发力而不是下腰", "全幅度到底"],
    commonMistakes: ["用下腰顶起来而不是臀部", "速度太快"],
    videoQuery: "glute bridge activation exercise",
  },
  jumping_jack: {
    aliases: ["开合跳", "Jumping Jack", "星跳"],
    level: "初",
    target: ["全身", "心肺系统"],
    benefit: "最经典的全身高强度热身动作，快速提升心率进入运动状态。",
    muscles: "全身 · 心肺",
    tips: ["轻盈落地(前脚掌)", "手臂全程参与", "保持节奏均匀"],
    commonMistakes: ["重重落地伤膝盖", "手臂不举过头顶"],
    videoQuery: "jumping jacks proper form",
  },
};

// ═══════════════════════════════════════════════════
// 5. 计划生成器
// ═══════════════════════════════════════════════════

/**
 * 根据用户画像生成个性化训练计划
 */
function generateWorkoutPlan(profile) {
  const { goal, level, daysPerWeek, duration, equipment } = profile;

  // 根据目标选择训练模板
  let planType;
  if (goal === "fat_loss") planType = "fullbody"; // 减脂→全身
  else if (goal === "muscle_gain") planType = "split"; // 增肌→分化
  else if (goal === "posture") planType = "posture"; // 体态→矫正
  else planType = "balanced"; // 默认均衡

  // 根据水平调整组数
  const levelMultiplier = { beginner: 0.75, intermediate: 1, advanced: 1.25 };
  const mult = levelMultiplier[level] || 1;

  // 构建周计划
  const weeklyPlan = buildWeeklyPlan(planType, daysPerWeek, mult, equipment);

  return {
    type: planType,
    profile: { goal, level, daysPerWeek, duration, equipment },
    schedule: weeklyPlan,
    warmup: WARMUP_ROUTINE,
    guidelines: getGuidelines(goal, level),
  };
}

/**
 * 构建周训练日程
 */
function buildWeeklyPlan(type, daysPerWeek, mult, equipment) {
  const days = [];

  switch (type) {
    case "split": // A/B 分化
      for (let i = 0; i < daysPerWeek; i++) {
        const isEven = i % 2 === 0;
        const template = isEven ? WORKOUT_TEMPLATES.dayA : WORKOUT_TEMPLATES.dayB;
        days.push({
          day: i + 1,
          label: `第${i + 1}天`,
          type: isEven ? "A" : "B",
          ...template,
          exercises: adjustVolume(template.exercises, mult),
        });
      }
      break;

    case "fullbody": // 全身
      for (let i = 0; i < daysPerWeek; i++) {
        const allExercises = [...WORKOUT_TEMPLATES.dayA.exercises.slice(0, 4),
                               ...WORKOUT_TEMPLATES.dayB.exercises.slice(0, 3)];
        days.push({
          day: i + 1,
          label: `第${i + 1}天`,
          type: "全身",
          name: "全身训练",
          focus: "全身均衡",
          exercises: adjustVolume(allExercises.slice(0, 5 + i % 2), mult),
          stretches: WORKOUT_TEMPLATES.dayA.stretches.slice(0, 2)
                       .concat(WORKOUT_TEMPLATES.dayB.stretches.slice(0, 2)),
        });
      }
      break;

    case "posture": // 体态矫正
      for (let i = 0; i < daysPerWeek; i++) {
        days.push({
          day: i + 1,
          label: `第${i + 1}天`,
          type: "矫正",
          name: "体态矫正训练",
          focus: "体态 · 核心 · 灵活性",
          exercises: [
            EXERCISE_DETAILS.plank && { ...EXERCISE_DETAILS.plank, sets: 3, reps: "30-45s", rest: "30s" },
            { name: "靠墙天使", sets: 3, reps: "10次慢速", rest: "30s", level: "初", target: ["肩外旋", "上背"], benefit: "改善圆肩驼背的经典康复动作。", muscles: "肩袖 · 菱形肌" },
            { name: "鸟狗式", sets: 3, reps: "每侧8-10次", rest: "45s", level: "中", target: ["核心抗旋转", "臀部"], benefit: "同时挑战核心稳定和臀部激活，对腰痛康复极佳。", muscles: "核心 · 臀部" },
            { name: "猫牛式", sets: 2, reps: "10次慢速", rest: "30s", level: "初", target: ["脊柱灵活性"], benefit: "温和地活动整条脊柱，缓解久坐僵硬。", muscles: "脊柱全长" },
          ].filter(Boolean),
          stretches: [
            { name: "胸廓门口拉伸", duration: "45s", target: "胸大肌 · 肩前束" },
            { name: "上颈屈曲拉伸", duration: "30s", target: "上斜方肌 · 颈伸肌" },
            { name: "髋屈肌跪姿拉伸", duration: "每侧45s", target: "髂腰肌 · 屈髋肌群" },
          ],
        });
      }
      break;

    default: // balanced
      return buildWeeklyPlan("split", Math.min(daysPerWeek, 3), mult, equipment);
  }

  return days;
}

/**
 * 根据水平调整训练量
 */
function adjustVolume(exercises, mult) {
  return exercises.map((ex) => ({
    ...ex,
    sets: Math.max(1, Math.round(ex.sets * mult)),
  }));
}

/**
 * 获取训练指南
 */
function getGuidelines(goal, level) {
  const base = {
    frequency: "每周 2-4 次，至少间隔一天休息",
    progression: "每 2-3 周增加 1 组 或 增加 1-2 次重复",
    rest: "组间休息 45-90 秒（复合动作多休息，孤立动作少休息）",
    intensity: "每个正式组保留 1-3 次余力（RIR 1-3），不需要力竭",
    tips: [
      "热身不能跳过！5-8 分钟热身能显著降低受伤风险",
      "动作质量 > 重量/次数。做对了再做多次",
      "感到尖锐疼痛立即停止，肌肉酸痛是正常的",
      "训练后 30-60 分钟内补充蛋白质",
      "睡眠 7-9 小时是增肌减脂的基础",
    ],
  };

  if (goal === "fat_loss") {
    base.tips.unshift("缩短组间休息至 45 秒内可提高代谢压力");
    base.tips.push("配合适度热量缺口（每日 -300~500 kcal）");
  } else if (goal === "muscle_gain") {
    base.tips.push("确保热量盈余（每日 +200~300 kcal）");
    base.tips.push("每公斤体重摄入 1.6-2.2g 蛋白质");
  }

  if (level === "beginner") {
    base.frequency = "每周 2-3 次，固定时间养成习惯";
    base.tips.unshift("新手前 4-6 周重点是学动作而不是冲重量");
  } else if (level === "advanced") {
    base.tips.push("考虑加入超级组/递减组等进阶技术");
  }

  return base;
}

// ═══════════════════════════════════════════════════
// 6. 时间轴数据生成（甘特图）
// ═══════════════════════════════════════════════════

/**
 * 从训练记录生成时间轴数据
 * @param {Array} sessionExercises - 本次训练的动作列表
 * @param {Object} options - { startTime, avgSetTime, restTime }
 * @returns {Array} 时间轴事件列表
 */
function generateTimeline(sessionExercises, options = {}) {
  const { startTime = Date.now(), avgSetTime = 45, restTime = 60 } = options;
  const events = [];
  let currentTime = startTime;

  // 热身阶段
  events.push({
    type: "warmup",
    name: "热身",
    start: currentTime,
    end: currentTime + 5 * 60 * 1000, // 5分钟热身
    color: "#55c8ff",
    category: "准备",
  });
  currentTime = events[0].end + restTime * 1000;

  // 正式训练
  sessionExercises.forEach((exercise, idx) => {
    const exInfo = findExerciseDetail(exercise.name || exercise.id);
    const setCount = exercise.sets || 3;
    const setTime = (avgSetTime + (exInfo?.level === "高" ? 15 : 0)) * 1000;

    for (let s = 0; s < setCount; s++) {
      events.push({
        type: "set",
        name: `${exercise.name || exercise.id} 第${s + 1}组`,
        exerciseName: exercise.name || exercise.id,
        setNumber: s + 1,
        start: currentTime,
        end: currentTime + setTime,
        color: getExerciseColor(idx),
        category: exercise.target?.join("/") || "训练",
        reps: exercise.reps || "-",
      });
      currentTime = events[events.length - 1].end + restTime * 1000;
    }
  });

  // 拉伸
  events.push({
    type: "stretch",
    name: "拉伸放松",
    start: currentTime,
    end: currentTime + 5 * 60 * 1000,
    color: "#ec4899",
    category: "恢复",
  });

  return events;
}

/**
 * 查找动作详情
 */
function findExerciseDetail(nameOrId) {
  const key = Object.keys(EXERCISE_DETAILS).find((k) => {
    const d = EXERCISE_DETAILS[k];
    return d.aliases?.includes(nameOrId) || k === nameOrId || d === nameOrId;
  });
  return key ? EXERCISE_DETAILS[key] : null;
}

/**
 * 获取动作颜色（循环色板）
 */
function getExerciseColor(index) {
  const colors = [
    "#6bbd00", // 绿
    "#55c8ff", // 蓝
    "#f59e0b", // 橙
    "#ec4899", // 粉
    "#8b5cf6", // 紫
    "#ef4444", // 红
    "#14b8a6", // 青
  ];
  return colors[index % colors.length];
}

// ═══════════════════════════════════════════════════
// 7. 导出
// ═══════════════════════════════════════════════════

export {
  WORKOUT_TEMPLATES,
  WARMUP_ROUTINE,
  STRETCH_LIBRARY,
  EXERCISE_DETAILS,
  generateWorkoutPlan,
  generateTimeline,
  findExerciseDetail,
  getGuidelines,
};
