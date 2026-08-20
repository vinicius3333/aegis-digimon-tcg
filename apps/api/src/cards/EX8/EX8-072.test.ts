import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-072.js";

describe("EX8-072", () => {
  const source = { instanceId: "source", cardId: "EX8-072", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the mandatory Main delete effect and Security activation", () => {
    const module = getEffectModule("EX8-072")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers the [Trash][Your Turn] Barbamon (X Antibody) watcher", () => {
    expect(module.effectsForTiming(EffectTiming.None, { ...source, isOnBattleArea: () => false })).toHaveLength(1);
  });
});
