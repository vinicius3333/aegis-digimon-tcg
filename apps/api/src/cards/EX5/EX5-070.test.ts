import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX5-070.js";

describe("EX5-070 X Antibody Proto Form", () => {
  it("registers static color waiver, security return, and Main X Antibody evolution effects", () => {
    const source = { instanceId: "source", cardId: "EX5-070", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX5-070")!;
    expect(module.effectsForTiming(EffectTiming.None, source)[0]?.description).toContain("Ignore color requirements");
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.description).toContain("hand");
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)[0]?.description).toContain("X Antibody");
  });
  it("registers the inherited leave-field return and security placement effect", () => {
    const source = { instanceId: "source", cardId: "EX5-070", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX5-070")!.effectsForTiming(EffectTiming.OnLeaveFieldAnyone, source)[0]?.isInherited).toBe(true);
  });
});
