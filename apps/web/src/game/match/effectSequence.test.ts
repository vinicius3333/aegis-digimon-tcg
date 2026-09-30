import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { DEFAULT_PACING } from "../pacing";
import { announceMsFor, createEffectSequence, isMinorEffect, sequentialBudgetMs, settleMsFor } from "./effectSequence";

const triggered = (effectKey: string): ServerEvent => ({
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: effectKey.toUpperCase(),
  sourceInstanceId: effectKey,
  effectKey,
  description: effectKey,
});
const resolved = (effectKey: string): ServerEvent =>
  ({ ...triggered(effectKey), kind: "effectResolved" }) as ServerEvent;
const draw: ServerEvent = { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["x"], seat: 0 };

/** One copy of a card whose printed effect repeats across copies: same card and text, its own key. */
const copy = (instanceId: string, kind: "effectTriggered" | "effectResolved"): ServerEvent =>
  ({
    kind,
    seat: 0,
    sourceCardId: "BT20-091",
    sourceInstanceId: instanceId,
    effectKey: `subtrigger/${instanceId}`,
    timing: "whenOneOfYoursDigivolves",
    description: "Cool Boy",
  }) as ServerEvent;

describe("effect sequence", () => {
  it("announces the same effect repeated right after itself as one unit", () => {
    const sequence = createEffectSequence();
    const unit = sequence.observeBatch("b1", 1, [copy("first", "effectTriggered"), draw]).opened[0]!.unit;
    sequence.observeBatch("b2", 2, [copy("first", "effectResolved")]);
    const second = sequence.observeBatch("b3", 3, [copy("second", "effectTriggered"), draw]);
    expect(second.opened).toEqual([]);
    expect(second.grouped).toEqual([{ unit, eventIndex: 0 }]);
    expect(unit.closed).toBe(false);
    sequence.observeBatch("b4", 4, [copy("second", "effectResolved")]);
    expect(unit.count).toBe(2);
    expect(unit.closed).toBe(true);
    expect([...unit.batchIds]).toEqual(["b1", "b2", "b3", "b4"]);
    expect(sequence.pendingCount()).toBe(1);
  });

  it("opens a new unit when the earlier copy is already on screen", () => {
    const sequence = createEffectSequence();
    const unit = sequence.observeBatch("b1", 1, [copy("first", "effectTriggered")]).opened[0]!.unit;
    sequence.observeBatch("b2", 2, [copy("first", "effectResolved")]);
    unit.started.release();
    const second = sequence.observeBatch("b3", 3, [copy("second", "effectTriggered")]);
    expect(second.opened).toHaveLength(1);
    expect(second.grouped).toEqual([]);
    expect(unit.count).toBe(1);
  });

  it("opens a new unit for a different effect in between", () => {
    const sequence = createEffectSequence();
    sequence.observeBatch("b1", 1, [copy("first", "effectTriggered"), copy("first", "effectResolved")]);
    sequence.observeBatch("b2", 2, [triggered("a"), resolved("a")]);
    expect(sequence.observeBatch("b3", 3, [copy("second", "effectTriggered")]).opened).toHaveLength(1);
  });

  it("gives a unit every batch from its announcement to its resolution", () => {
    const sequence = createEffectSequence();
    const opened = sequence.observeBatch("b1", 1, [triggered("a")]);
    const unit = opened.opened[0]!.unit;
    expect(sequence.observeBatch("b2", 2, [draw]).owner).toBe(unit);
    expect(sequence.observeBatch("b3", 3, [resolved("a")]).owner).toBe(unit);
    expect([...unit.batchIds]).toEqual(["b1", "b2", "b3"]);
    expect(unit.closed).toBe(true);
    expect(sequence.observeBatch("b4", 4, [draw]).owner).toBeUndefined();
  });

  it("queues each unit behind the one before it", () => {
    const sequence = createEffectSequence();
    const first = sequence.observeBatch("b1", 1, [triggered("a")]).opened[0]!.unit;
    const second = sequence.observeBatch("b2", 2, [triggered("b")]).opened[0]!.unit;
    expect(first.announced.after).toBe(first.started);
    expect(second.started.after).toBe(first.announced);
    expect(sequence.pendingCount()).toBe(2);
    sequence.settle(first);
    expect(sequence.pendingCount()).toBe(1);
    expect(sequence.hasLaterUnit(first)).toBe(true);
  });

  it("opens the cause of a live change once its batch's unit is announced", async () => {
    const sequence = createEffectSequence();
    const cause = sequence.causeOfLiveChange(2);
    const unit = sequence.observeBatch("b2", 2, [triggered("a"), draw]).opened[0]!.unit;
    expect(cause.open).toBe(false);
    unit.announced.release();
    await unit.announced.opened;
    await Promise.resolve();
    expect(cause.open).toBe(true);
  });

  it("pins a live change to the earliest batch still to come, not the newest", () => {
    const sequence = createEffectSequence();
    sequence.noteVersion(1);
    const cause = sequence.causeOfLiveChange(5);
    const first = sequence.observeBatch("b2", 2, [triggered("a")]).opened[0]!.unit;
    sequence.observeBatch("b3", 3, [triggered("b")]);
    expect(cause.after?.open).toBe(false);
    first.started.release();
    first.announced.release();
    return first.announced.opened.then(async () => {
      await Promise.resolve();
      expect(cause.open).toBe(true);
    });
  });

  it("lets go of a live change's cause when its batch carries no effect", () => {
    const sequence = createEffectSequence();
    sequence.noteVersion(2);
    const cause = sequence.causeOfLiveChange(3);
    sequence.noteVersion(3);
    expect(cause.open).toBe(true);
    expect(sequence.observedVersion()).toBe(3);
  });

  it("stretches a budget per pending unit, up to the ceiling, and leaves it alone with none", () => {
    expect(sequentialBudgetMs(4000, 0)).toBe(4000);
    expect(sequentialBudgetMs(4000, 1)).toBeGreaterThan(4000);
    expect(sequentialBudgetMs(4000, 50)).toBe(DEFAULT_PACING.budgetCeilingMs);
  });

  it("stretches a budget by the pacing it is given", () => {
    const pacing = { ...DEFAULT_PACING, unitBudgetMs: 1000, budgetCeilingMs: 9000 };
    expect(sequentialBudgetMs(4000, 2, pacing)).toBe(6000);
    expect(sequentialBudgetMs(4000, 10, pacing)).toBe(9000);
  });
});

const memoryGain: ServerEvent = { kind: "memoryChanged", from: 1, to: 2, reason: "effect" };
const dpBoost: ServerEvent = { kind: "dpModifierApplied", permanentId: "p", delta: 1000 };

function playedUnit(results: readonly ServerEvent[], close = true) {
  const sequence = createEffectSequence();
  const unit = sequence.observeBatch("b1", 1, [triggered("a")]).opened[0]!.unit;
  sequence.observeBatch("b2", 2, results);
  if (close) sequence.observeBatch("b3", 3, [resolved("a")]);
  return unit;
}

describe("minor effects", () => {
  it("is minor when a closed effect only changed memory or DP", () => {
    expect(isMinorEffect(playedUnit([memoryGain]))).toBe(true);
    expect(isMinorEffect(playedUnit([dpBoost, memoryGain]))).toBe(true);
  });

  it("is minor when a closed effect reported no event, as an ordinary DP change does", () => {
    expect(isMinorEffect(playedUnit([]))).toBe(true);
  });

  it("is not minor when a card moved, even beside a memory change", () => {
    expect(isMinorEffect(playedUnit([memoryGain, draw]))).toBe(false);
  });

  it("is not minor while the effect is still open", () => {
    expect(isMinorEffect(playedUnit([memoryGain], false))).toBe(false);
  });

  it("gives a minor effect the short beats", () => {
    const minor = playedUnit([memoryGain]);
    const full = playedUnit([draw]);
    expect(announceMsFor(minor, DEFAULT_PACING)).toBe(DEFAULT_PACING.minorAnnounceMs);
    expect(settleMsFor(minor, DEFAULT_PACING)).toBe(DEFAULT_PACING.minorSettleMs);
    expect(announceMsFor(full, DEFAULT_PACING)).toBe(DEFAULT_PACING.announceMs);
    expect(settleMsFor(full, DEFAULT_PACING)).toBe(DEFAULT_PACING.settleMs);
  });
});
