import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { createEffectSequence, sequentialBudgetMs, SEQUENTIAL_BUDGET_CEILING_MS } from "./effectSequence";

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

describe("effect sequence", () => {
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
    expect(sequentialBudgetMs(4000, 50)).toBe(SEQUENTIAL_BUDGET_CEILING_MS);
  });
});
