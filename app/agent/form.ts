// app/agent/form.js
// 形态评估（纯函数）。独立成模块，供 memory / tools / coachAgent 复用，避免循环依赖。

/**
 * 从一次动作的关键指标中，提炼出"问题标签"。
 * @param {{exercise:string, score:number, jointAngle:number, symmetryError?:number, kneeGap?:number, ankleGap?:number, bodyLine?:number}} m
 * @returns {string[]} issues
 */
export function assessForm(m) {
  const issues = [];
  if (m.exercise === "squat") {
    if ((m.kneeGap ?? 0) < (m.ankleGap ?? 1) * 0.63) issues.push("膝盖内扣(valgus)");
    if ((m.symmetryError ?? 0) > 12) issues.push("左右不对称");
    if (m.score < 80) issues.push("下蹲深度不足");
  } else if (m.exercise === "pushup") {
    if ((m.bodyLine ?? 180) < 158) issues.push("躯干下沉/核心松散");
    if (m.score < 80) issues.push("下放幅度不足");
  } else if (m.exercise === "jack") {
    if (m.score < 90) issues.push("开合幅度不到位");
  }
  return issues;
}

export default assessForm;
