import { describe, expect, it } from "vitest";

import { createPresentationTelemetry, PRESENTATION_TELEMETRY_CAPACITY } from "./presentationTelemetry";

function clock(start = 0) {
  let at = start;
  return {
    now: () => at,
    advance(ms: number) {
      at += ms;
    },
  };
}

describe("presentation telemetry", () => {
  it("records depth and time to idle per batch", () => {
    const time = clock();
    const telemetry = createPresentationTelemetry(time.now);

    telemetry.present("batch-1", 4);
    telemetry.countStep();
    telemetry.countStep();
    time.advance(900);
    telemetry.present("batch-2", 5);
    telemetry.countStep();
    time.advance(100);
    telemetry.settle();

    expect(telemetry.read().batches).toEqual([
      { batchId: "batch-1", stateVersion: 4, steps: 2, timeToIdleMs: 1000 },
      { batchId: "batch-2", stateVersion: 5, steps: 1, timeToIdleMs: 100 },
    ]);
  });

  it("leaves a batch still being presented open", () => {
    const telemetry = createPresentationTelemetry(clock().now);
    telemetry.present("batch-1", 1);
    expect(telemetry.read().batches[0]?.timeToIdleMs).toBeUndefined();
  });

  it("counts a step only into the batch being presented", () => {
    const telemetry = createPresentationTelemetry(clock().now);
    telemetry.countStep();
    telemetry.present("batch-1", 1);
    telemetry.countStep();
    telemetry.settle();
    telemetry.countStep();
    expect(telemetry.read().batches.map((batch) => batch.steps)).toEqual([1]);
  });

  it("counts budget rescues, skips and manual advances", () => {
    const telemetry = createPresentationTelemetry(clock().now);
    telemetry.countBoardBudgetHit();
    telemetry.countDecisionBudgetHit();
    telemetry.countDecisionBudgetHit();
    telemetry.countSkip();
    telemetry.countManualAdvance();
    telemetry.countManualAdvance();
    telemetry.countManualAdvance();

    expect(telemetry.read().counters).toEqual({
      boardBudgetHits: 1,
      decisionBudgetHits: 2,
      skips: 1,
      manualAdvances: 3,
    });
  });

  it("keeps only the most recent batches", () => {
    const telemetry = createPresentationTelemetry(clock().now);
    const total = PRESENTATION_TELEMETRY_CAPACITY + 5;
    for (let index = 0; index < total; index += 1) telemetry.present(`batch-${index}`, index);

    const { batches } = telemetry.read();
    expect(batches).toHaveLength(PRESENTATION_TELEMETRY_CAPACITY);
    expect(batches[0]?.batchId).toBe("batch-5");
    expect(batches.at(-1)?.batchId).toBe(`batch-${total - 1}`);
  });

  it("resets both the records and the counters", () => {
    const telemetry = createPresentationTelemetry(clock().now);
    telemetry.present("batch-1", 1);
    telemetry.countSkip();
    telemetry.reset();
    expect(telemetry.read()).toEqual({
      batches: [],
      counters: { boardBudgetHits: 0, decisionBudgetHits: 0, skips: 0, manualAdvances: 0 },
    });
  });
});
