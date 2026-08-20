import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-005.js";

describe("EX7-005 Wizardmon", () => {
  it("registers an inherited once-per-turn Three Musketeers Option stack watcher", () => {
    const source = { instanceId: "source", cardId: "EX7-005", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const effect = getEffectModule("EX7-005")!.effectsForTiming(EffectTiming.None, source)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.maxPerTurn).toBe(1);
    expect(effect.description).toContain("Three Musketeers");
  });
});
