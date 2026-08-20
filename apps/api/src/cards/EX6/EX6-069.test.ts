import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-069.js";

describe("EX6-069 Gate of Deadly Sins Option", () => {
  it("registers Main placement from hand/trash and Security permanent effects", () => {
    const source = { instanceId: "source", cardId: "EX6-069", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX6-069")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)[0]?.description).toContain("Seven Great Demon Lords");
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.description).toContain("battle-area permanent");
  });
  it("registers the Seven Great Demon Lords deletion Delay watcher", () => {
    const source = { instanceId: "source", cardId: "EX6-069", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX6-069")!.effectsForTiming(EffectTiming.None, source)[0]?.description).toContain("Delay");
  });
});
