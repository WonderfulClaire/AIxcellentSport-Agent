# Architecture

AIxcellentSport currently uses a deliberately small, local-first pipeline:

1. The browser requests camera permission.
2. MediaPipe Pose Landmarker produces 33 normalized landmarks per frame.
3. Exercise-specific geometry derives joint angles and movement phases.
4. A small state machine counts completed repetitions.
5. Explainable rules produce short coaching cues and a quality score.
6. Canvas renders the landmark overlay; raw frames are not uploaded.

The MVP is a software-first continuation of the earlier AIxcellent Sports concept. It preserves the original real-time correction and personalized guidance vision while removing the need for dedicated camera hardware.

## Boundaries

- Current scores are heuristic feedback, not clinical measurements.
- Camera angle, occlusion, lighting, and body proportions affect results.
- Any future learned temporal model should be evaluated against a documented dataset and retain interpretable safety checks.
