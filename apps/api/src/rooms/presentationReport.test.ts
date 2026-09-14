import { describe, expect, it } from "vitest";
import { parsePresentationReport } from "./presentationReport.js";

const report = {
  phase: "finished",
  stepId: "narration-step-1",
  track: "centerStage",
  batchId: "batch-30",
  stateVersion: 21,
  clientTimestamp: 123,
  durationMs: 480,
  mode: "live",
  cancelled: false,
  skipping: false,
  failed: false,
  pendingCount: 2,
};

describe("client animation log validation", () => {
  it("retains correlation fields and strips arbitrary client content", () => {
    expect(parsePresentationReport({ ...report, seat: 1, cards: ["private-card"], extra: "untrusted" })).toEqual(
      report,
    );
  });
  it.each([
    null,
    [],
    { ...report, track: "bad\nlog" },
    { ...report, stepId: "a".repeat(161) },
    { ...report, durationMs: Infinity },
    { ...report, stateVersion: -1 },
    { ...report, pendingCount: 0.5 },
    { ...report, cancelled: "false" },
    { ...report, phase: "invented" },
  ])("rejects malformed diagnostic payloads", (payload) => {
    expect(parsePresentationReport(payload)).toBeUndefined();
  });
});
