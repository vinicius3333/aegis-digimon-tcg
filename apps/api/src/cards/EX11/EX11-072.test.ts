import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-072.js";

describe("EX11-072 Unique Emblem: Guardian Vortex", () => {
  it("registers its Main play-and-place behavior in the executable option window", () => {
    const source = {
      cardId: "EX11-072",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const effects = getEffectModule("EX11-072")!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toContain("EX11-072");
  });
});
