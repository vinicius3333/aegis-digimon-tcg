import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-073.js";

describe("EX4-073 Omnimon Alter-B", () => {
  it("registers mandatory When Digivolving and optional When Attacking effects", () => {
    const source = { instanceId: "source", cardId: "EX4-073", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX4-073")!;
    const digivolving = module.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const attacking = module.effectsForTiming(EffectTiming.OnAllyAttack, source);
    expect(digivolving).toHaveLength(1);
    expect(digivolving[0]?.optional).toBe(false);
    expect(attacking).toHaveLength(1);
    expect(attacking[0]?.optional).toBe(true);
  });
});
