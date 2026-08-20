import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX5-065.js";

describe("EX5-065 Sayo & Koh", () => {
  it("registers the your-turn add-digivolution memory effect and opponent-turn start effect", () => {
    const source = { instanceId: "source", cardId: "EX5-065", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)[0]?.description).toContain("gain 1 memory");
    expect(module.effectsForTiming(EffectTiming.OnStartTurn, source)[0]?.description).toContain("DNA Digivolve");
  });
  it("registers the mandatory security play effect", () => {
    const source = { instanceId: "source", cardId: "EX5-065", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.optional).toBe(false);
  });
});
