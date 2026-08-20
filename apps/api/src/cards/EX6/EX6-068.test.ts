import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-068.js";

describe("EX6-068 Angel Option", () => {
  it("registers Main placement and Security permanent effects", () => {
    const source = { instanceId: "source", cardId: "EX6-068", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX6-068")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)[0]?.description).toContain("security stack");
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.description).toContain("battle-area permanent");
  });
  it("registers the Angel deletion Delay watcher", () => {
    const source = { instanceId: "source", cardId: "EX6-068", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX6-068")!.effectsForTiming(EffectTiming.None, source)[0]?.description).toContain("Delay");
  });
});
