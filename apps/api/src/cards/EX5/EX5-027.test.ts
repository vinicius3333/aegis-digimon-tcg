import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX5-027.js";

describe("EX5-027 Liollmon", () => {
  it("registers a security-search On Play and inherited On Deletion effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-027",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-027")!;
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]?.description).toContain(
      "Modify DP by -2000",
    );
  });
});
