"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentSolarTerm,
  generateDailyWellnessAdvice,
  getUserLocation,
  BODY_TYPES,
} from "../agent/tcmEngine.js";

type WellnessAdvice = ReturnType<typeof generateDailyWellnessAdvice>;
type WeatherData = { temp: number; humidity: number; condition: string; wind: number };

export default function TCMWellness() {
  const [advice, setAdvice] = useState<WellnessAdvice | null>(null);
  const [location, setLocation] = useState<{ city?: string; latitude?: number; longitude?: number }>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [bodyType, setBodyType] = useState("balanced");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  // 初始化：生成基础建议（不依赖位置/天气）
  useEffect(() => {
    setAdvice(generateDailyWellnessAdvice(location, weather || {}, bodyType));
  }, [location, weather, bodyType]);

  // 获取地理位置
  const requestLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const pos = await getUserLocation();
      setLocation({ ...pos });
      // 尝试获取天气（使用免费 Open-Meteo API）
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${pos.latitude}&longitude=${pos.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      )
        .then((r) => r.json())
        .then((data) => {
          const w = data.current;
          const conditionMap: Record<number, string> = {
            0: "晴", 1: "大部晴", 2: "多云", 3: "阴", 45: "雾",
            48: "雾凇", 51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨",
            61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 73: "中雪",
            75: "大雪", 80: "阵雨", 81: "中阵雨", 82: "大阵雨",
            95: "雷暴", 96: "雷暴+冰雹", 99: "强雷暴",
          };
          setWeather({
            temp: Math.round(w.temperature_2m),
            humidity: Math.round(w.relative_humidity_2m),
            condition: conditionMap[w.weather_code] || "未知",
            wind: Math.round(w.wind_speed_10m),
          });
          // 获取城市名（反向地理编码）
          return fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${pos.latitude}&longitude=${pos.longitude}&count=1&language=zh`
          );
        })
        .then((r) => r.json())
        .then((geo) => {
          if (geo.results?.[0]?.name) {
            setLocation((prev) => ({ ...prev, city: geo.results[0].name + (geo.results[0].admin1 ? `, ${geo.results[0].admin1}` : "") }));
          }
        })
        .catch(() => setWeatherError("天气获取失败，使用默认数据"));
    } catch (e) {
      console.warn("Location error:", e);
      setWeatherError("无法获取位置，可手动输入城市");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  // 体质测试
  const quizQuestions = [
    { q: "你容易感到疲劳吗？", options: ["从不", "偶尔", "经常", "总是"] },
    { q: "你的手脚容易冰凉吗？", options: ["手脚温暖", "偶尔凉", "经常凉", "总是冰凉"] },
    { q: "你容易口干舌燥吗？", options: ["很少", "有时", "经常", "非常明显"] },
    { q: "你的体型偏？", options: ["偏瘦", "标准", "微胖", "肥胖"] },
    { q: "你说话的声音通常？", options: ["洪亮有力", "正常", "偏小声", "有气无力"] },
  ];

  const handleQuizAnswer = (qIdx: number, aIdx: number) => {
    const next = [...quizAnswers];
    next[qIdx] = aIdx;
    setQuizAnswers(next);

    if (next.filter((a) => a !== undefined).length === quizQuestions.length) {
      // 计算体质
      const scores = { qi_deficiency: 0, yang_deficiency: 0, yin_deficiency: 0, phlegm_dampness: 0, balanced: 0 };
      next.forEach((a, i) => {
        if (i === 0 && a >= 2) scores.qi_deficiency += a;
        if (i === 1 && a >= 2) scores.yang_deficiency += a;
        if (i === 2 && a >= 2) scores.yin_deficiency += a;
        if (i === 3 && a >= 2) scores.phlegm_dampness += a;
        if (a <= 1) scores.balanced += 1;
      });

      const maxScore = Math.max(...Object.values(scores));
      const dominant = Object.entries(scores).find(([_, v]) => v === maxScore)?.[0] || "balanced";
      setBodyType(dominant);
      setShowQuiz(false);
      setQuizAnswers([]);
    }
  };

  if (!advice) return <div className="tcm-loading">加载中…</div>;

  return (
    <div className="tcm-wellness">
      <div className="tcm-header">
        <h2>🌿 中医养生</h2>
        <p>结合节气、气候与个人体质，给你最详尽的健康指导</p>
      </div>

      {/* 位置 & 天气 */}
      <div className="tcm-location-bar">
        <div className="tcm-loc-info">
          <span className="tcm-loc-icon">📍</span>
          <span>{location.city || "未知位置"}</span>
          {weather && (
            <span className="tcm-weather">
              {weather.condition} · {weather.temp}°C · 湿度{weather.humidity}%
            </span>
          )}
        </div>
        {!location.city && (
          <button className="tcm-loc-btn" onClick={requestLocation} disabled={loadingLocation}>
            {loadingLocation ? "定位中…" : "获取位置"}
          </button>
        )}
        {weatherError && <small className="tcm-error">{weatherError}</small>}
      </div>

      {/* 节气卡片 */}
      <div className="tcm-solar-card">
        <div className="tcm-solar-main">
          <span className="tcm-term-name">{advice.solarTerm.name}</span>
          <span className="tcm-term-sub">
            距「{advice.solarTerm.next}」还有 {advice.solarTerm.daysToNext} 天
          </span>
        </div>
        <div className="tcm-solar-detail">
          <div className="tcm-detail-item">
            <span className="tcm-detail-label">养生原则</span>
            <p>{advice.solarTerm.principle}</p>
          </div>
          <div className="tcm-detail-row">
            <div className="tcm-detail-item">
              <span className="tcm-detail-label">🍲 推荐食材</span>
              <p>{advice.solarTerm.recommendedDiet}</p>
            </div>
            <div className="tcm-detail-item">
              <span className="tcm-detail-label">🏃 推荐运动</span>
              <p>{advice.solarTerm.recommendedExercise}</p>
            </div>
          </div>
          <div className="tcm-detail-item tcm-avoid">
            <span className="tcm-detail-label">⚠️ 宜忌</span>
            <p>{advice.solarTerm.avoid}</p>
          </div>
        </div>
      </div>

      {/* 天气联动建议 */}
      {weather && advice.weatherAdvice.length > 0 && (
        <div className="tcm-weather-advice">
          <h4>🌤️ 今日天气 × 中医建议</h4>
          {advice.weatherAdvice.map((item, i) => (
            <div key={i} className={`tcm-wa-item tcm-wa-${item.type}`}>
              <span className="tcm-wa-type">{item.type === "warn" ? "⚠️" : item.type === "diet" : "🍜" : item.type === "exercise" ? "🏋️" : "💡"}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* 体质辨识 */}
      <div className="tcm-bodytype-section">
        <div className="tcm-bt-header">
          <h4>🧘 体质辨识</h4>
          <span className="tcm-current-type">
            当前：<strong>{BODY_TYPES.find((bt) => bt.id === bodyType)?.name || "平和质"}</strong>
          </span>
          <button onClick={() => setShowQuiz(!showQuiz)}>
            {showQuiz ? "关闭测试" : "重新测试"}
          </button>
        </div>

        {/* 体质详情 */}
        <div className="tcm-bt-detail">
          <div className="tcm-bt-row">
            <div className="tcm-bt-item"><span>食疗推荐</span><p>{advice.bodyType.diet}</p></div>
            <div className="tcm-bt-item"><span>运动建议</span><p>{advice.bodyType.exercise}</p></div>
          </div>
          <div className="tcm-bt-item"><span>注意事项</span><p>{advice.bodyType.avoid}</p></div>
          <div className="tcm-bt-item tcm-acupoint">
            <span>穴位保健</span><p>每日按摩：{advice.bodyType.acupoints}</p>
          </div>
        </div>

        {/* 测试问卷 */}
        {showQuiz && (
          <div className="tcm-quiz">
            <h5>简单5题，了解你的中医体质</h5>
            {quizQuestions.map((qq, qi) => (
              <div key={qi} className="tcm-q-item">
                <p className="tcm-q-text">{qi + 1}. {qq.q}</p>
                <div className="tcm-q-options">
                  {qq.options.map((opt, oi) => (
                    <button
                      key={oi}
                      className={`tcm-q-btn ${quizAnswers[qi] === oi ? "selected" : ""}`}
                      onClick={() => handleQuizAnswer(qi, oi)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 每日综合提示 */}
      <div className="tcm-daily-tips">
        <h4>✨ 今日养生要点</h4>
        <ul>
          {advice.todayTips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
