import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX5-053.js";

describe("EX5-053 Baihumon", () => {
  it("registers a mandatory once-per-turn security-check reaction and deletion removal", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-053",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-053")!;
    const securityEffect = module.effectsForTiming(EffectTiming.OnSecurityCheck, source)[0]!;
    expect(securityEffect.maxPerTurn).toBe(1);
    expect(securityEffect.optional).toBe(false);
    expect(module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });
});
