import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-001.js";

describe("EX6-001 Kokuwamon", () => {
  it("registers an inherited continuous Legend-Arms add-to-stack watcher", () => {
    const source = { instanceId: "source", cardId: "EX6-001", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const effect = getEffectModule("EX6-001")!.effectsForTiming(EffectTiming.None, source)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.maxPerTurn).toBe(1);
    expect(effect.description).toContain("Legend-Arms");
  });
});
