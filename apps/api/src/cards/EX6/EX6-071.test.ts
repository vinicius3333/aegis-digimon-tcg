import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-071.js";

describe("EX6-071 Dark Despair", () => {
  it("registers Main and Security effects", () => {
    const source = { instanceId: "source", cardId: "EX6-071", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX6-071")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)[0]?.description).toContain("5 or more cards");
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.description).toContain("Activate");
  });
});
