import { describe, expect, it } from "vitest";
import { parseCoachReply } from "./coachAgent";

describe("parseCoachReply", () => {
  it("accepts the strict coaching contract", () => {
    expect(
      parseCoachReply(
        JSON.stringify({
          message: "膝盖朝脚尖方向推开，慢一点。",
          tone: "warn",
          focusArea: "膝盖内扣",
        }),
      ),
    ).toEqual({
      message: "膝盖朝脚尖方向推开，慢一点。",
      tone: "warn",
      focusArea: "膝盖内扣",
    });
  });

  it("rejects malformed or schema-invalid model output", () => {
    expect(parseCoachReply("not json")).toBeNull();
    expect(parseCoachReply(JSON.stringify({ message: "ok", tone: "other" }))).toBeNull();
    expect(parseCoachReply(JSON.stringify({ message: 42, tone: "good" }))).toBeNull();
    expect(
      parseCoachReply(JSON.stringify({ message: "x".repeat(241), tone: "good" })),
    ).toBeNull();
  });

  it("normalizes optional focusArea without inventing values", () => {
    expect(
      parseCoachReply(JSON.stringify({ message: "保持节奏。", tone: "good", focusArea: null })),
    ).toEqual({ message: "保持节奏。", tone: "good", focusArea: null });
  });
});
