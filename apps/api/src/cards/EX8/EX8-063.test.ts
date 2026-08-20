import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-063.js";

describe("EX8-063", () => {
  const source = { instanceId: "source", cardId: "EX8-063", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the once-per-turn opponent discard-or-Fallen Angel effect when digivolving and attacking", () => {
    const module = getEffectModule("EX8-063")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]?.maxPerTurn).toBe(1);
  });
  it("registers the once-per-turn opponent-hand-trash security watcher", () => {
    const module = getEffectModule("EX8-063")!;
    expect(module.effectsForTiming(EffectTiming.None, source)[0]?.maxPerTurn).toBe(1);
  });
});
