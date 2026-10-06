import { describe, expect, it } from "vitest";
import type { SequencedServerEvent } from "@aegis/shared";
import {
  MAX_LAB_BATCHES,
  MAX_LAB_STEP_EVENTS,
  activeSteps,
  barSpan,
  batchEventRows,
  effectsLabReducer,
  effectsLabTrace,
  emptyEffectsLab,
  stepBars,
  stepKeysOfBatch,
  stepTooltip,
  trackLanes,
  type LabStepEvent,
} from "./effectsLabModel";

function stepEvent(overrides: Partial<LabStepEvent>): LabStepEvent {
  return {
    key: "1",
    stepId: "step",
    track: "main",
    phase: "queued",
    mode: "live",
    cancelled: false,
    skipping: false,
    failed: false,
    at: 0,
    ...overrides,
  };
}

const triggered = {
  kind: "effectTriggered",
  seq: 7,
  batch: "b1",
  seat: 1,
  sourceCardId: "EX13-028",
  effectKey: "onDeletion",
  description: "[On Deletion] Draw 1.",
  timing: "onDeletion",
} as unknown as SequencedServerEvent;
const phase = { kind: "phaseChanged", seq: 6, batch: "b1" } as unknown as SequencedServerEvent;

describe("effects lab model", () => {
  it("keeps the last batches and step events only", () => {
    let state = emptyEffectsLab;
    for (let index = 0; index < MAX_LAB_BATCHES + 5; index += 1)
      state = effectsLabReducer(state, {
        type: "batch",
        batch: { id: `b${index}`, stateVersion: index, events: [] },
        at: index,
      });
    for (let index = 0; index < MAX_LAB_STEP_EVENTS + 5; index += 1)
      state = effectsLabReducer(state, { type: "step", event: stepEvent({ key: `${index}` }) });

    expect(state.batches).toHaveLength(MAX_LAB_BATCHES);
    expect(state.batches[0]?.id).toBe("b5");
    expect(state.stepEvents).toHaveLength(MAX_LAB_STEP_EVENTS);
    expect(state.stepEvents[0]?.key).toBe("5");
  });

  it("records a batch once and resets to empty", () => {
    const batch = { id: "b1", stateVersion: 3, events: [phase, triggered] };
    let state = effectsLabReducer(emptyEffectsLab, { type: "batch", batch, at: 10 });
    state = effectsLabReducer(state, { type: "batch", batch, at: 20 });
    expect(state.batches).toHaveLength(1);
    expect(effectsLabReducer(state, { type: "reset" })).toBe(emptyEffectsLab);
  });

  it("folds step events into bars with how each step ended", () => {
    const bars = stepBars([
      stepEvent({ key: "a", stepId: "banner", track: "phaseBanner", phase: "queued", at: 0 }),
      stepEvent({
        key: "a",
        stepId: "banner",
        track: "phaseBanner",
        phase: "started",
        at: 5,
        batchId: "b1",
        stateVersion: 3,
      }),
      stepEvent({ key: "a", stepId: "banner", track: "phaseBanner", phase: "finished", at: 905, durationMs: 900 }),
      stepEvent({ key: "b", stepId: "clash", track: "centerStage", phase: "started", at: 10 }),
      stepEvent({ key: "b", stepId: "clash", track: "centerStage", phase: "finished", at: 20, cancelled: true }),
      stepEvent({ key: "c", stepId: "late", track: "centerStage", phase: "dropped", at: 30, cancelled: true }),
      stepEvent({ key: "d", stepId: "skipped", phase: "started", at: 40 }),
      stepEvent({ key: "d", stepId: "skipped", phase: "finished", at: 41, skipping: true }),
      stepEvent({ key: "e", stepId: "running", phase: "started", at: 50 }),
      stepEvent({ key: "f", stepId: "waiting", phase: "queued", at: 60 }),
    ]);

    expect(bars.map((bar) => [bar.key, bar.status])).toEqual([
      ["a", "finished"],
      ["b", "cancelled"],
      ["c", "dropped"],
      ["d", "skipped"],
      ["e", "running"],
      ["f", "queued"],
    ]);
    expect(bars[0]).toMatchObject({ batchId: "b1", stateVersion: 3, startedAt: 5, endedAt: 905, durationMs: 900 });
    expect(trackLanes(bars).map((lane) => [lane.track, lane.bars.length])).toEqual([
      ["phaseBanner", 1],
      ["centerStage", 2],
      ["main", 3],
    ]);
    const { running, queued } = activeSteps(bars);
    expect(running.map((bar) => bar.key)).toEqual(["e"]);
    expect(queued.map((bar) => bar.key)).toEqual(["f"]);
    expect(barSpan(bars[4]!, 80)).toEqual({ start: 50, end: 80 });
    expect(barSpan(bars[5]!, 80)).toEqual({ start: 60, end: 60 });
    expect(stepKeysOfBatch(bars, "b1")).toEqual(new Set(["a"]));
    expect(stepTooltip(bars[0]!)).toContain("batch b1 · v3");
  });

  it("gives effect events their seat, source, timing and description", () => {
    const rows = batchEventRows({ id: "b1", stateVersion: 3, events: [phase, triggered], receivedAt: 0 });
    expect(rows).toEqual([
      { seq: 6, kind: "phaseChanged" },
      {
        seq: 7,
        kind: "effectTriggered",
        seat: 1,
        sourceCardId: "EX13-028",
        timing: "onDeletion",
        description: "[On Deletion] Draw 1.",
      },
    ]);
  });

  it("serializes a trace with batches, decisions and step events", () => {
    let state = effectsLabReducer(emptyEffectsLab, {
      type: "batch",
      batch: { id: "b1", stateVersion: 3, events: [triggered] },
      at: 1,
    });
    state = effectsLabReducer(state, { type: "step", event: stepEvent({}) });
    const trace = JSON.parse(effectsLabTrace(state, { scenario: "effects-lab-nested" }));
    expect(trace.scenario).toBe("effects-lab-nested");
    expect(trace.batches[0].events[0].description).toBe("[On Deletion] Draw 1.");
    expect(trace.stepEvents).toHaveLength(1);
  });
});
