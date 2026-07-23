# AIxcellentSport Agent Guide

## Product
- Open-source, browser-based AI movement coach.
- Raw camera frames stay on-device in the MVP.
- Feedback is educational and must not be presented as medical diagnosis.

## Run
- Install: `npm ci`
- Develop: `npm run dev`
- Verify: `npm run lint && npm test`

## Architecture
- `app/page.tsx`: camera, MediaPipe inference, exercise rules, UI, and the bridge that calls the CoachAgent on every completed rep.
- `app/agent/`: the **agentic layer** (see below).
- `app/globals.css`: visual system and responsive layout.
- `tests/`: product-contract checks, including `agent.test.js` for the agent layer.
- `docs/`: architecture and product decisions.

### Agent layer (`app/agent/`)
- `memory.js` — `AgentMemory`: on-device (localStorage) long/session memory. Stores only structured metrics, never video. Drives adaptation (recurring issues → focus area).
- `form.js` — `assessForm`: pure function mapping rep metrics → issue tags (the explainable rules).
- `tools.js` — tool registry (`assess_form`, `log_rep`, `get_recurring_issues`, `set_goal`) usable by the agent and LLM function-calling.
- `coachAgent.js` — `CoachAgent`: planning loop (assess → remember → plan → coach). LLM call is OpenAI-compatible and optional; falls back to a deterministic heuristic when no key is set (demo never breaks).
- `multiAgent.js` — `runMultiAgent`: orchestrates three sub-agents — FormAnalyzer, ProgressTracker, PlanGenerator — for a structured training report.
- `index.js` — public exports + `loadAgentConfig()` (reads `window.__AGENT_CONFIG__` for an OpenAI-compatible endpoint).

## Conventions
- Keep movement rules explainable and exercise-specific.
- Do not upload or persist video without explicit user consent.
- New exercises need a phase definition, rep rule, feedback rule, and test.
- The agent must remain privacy-first: only structured metrics (never frames) may leave the device; LLM calls, if enabled, receive text only.
- Keep the public demo usable without an account or paid API (heuristic fallback must always work).
- Run `node --test tests/agent.test.js` after changing the agent layer.

## Current State
- MVP supports squat, push-up, and jumping-jack feedback.
- Next: calibration, session history, and extensible exercise profiles.
