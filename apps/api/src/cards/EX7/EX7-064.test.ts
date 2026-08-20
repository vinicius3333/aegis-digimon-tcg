import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-064.js";

describe("EX7-064", () => {
  const source = { instanceId: "source", cardId: "EX7-064", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main, end-turn, and security effects", () => {
    const module = getEffectModule("EX7-064")!;
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
