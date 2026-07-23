# Contributing to AIxcellentSport

Thanks for helping make movement feedback more understandable and accessible.

## Before you start

- Search existing issues and open one for substantial changes.
- For a new exercise, describe the supported camera view, movement phases, repetition boundary, feedback signals, and known edge cases.
- Coaching rules should have a clear biomechanical rationale and avoid diagnosis or guaranteed-outcome language.
- Never commit identifiable camera footage or health data.

## Local workflow

```bash
npm ci
npm run dev
npm run check
```

Use a focused branch such as `feat/lunge-profile` or `fix/camera-recovery`. Keep pull requests small enough to review and include synthetic or non-identifiable visual evidence for UI changes.

## Definition of done

- Product-contract tests and lint pass.
- Permission denied, missing camera, and model-loading errors remain understandable.
- New exercise logic includes phase, rep, and feedback coverage.
- Documentation and changelog are updated when behavior changes.
- No unsupported accuracy, medical, or privacy claim is introduced.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
