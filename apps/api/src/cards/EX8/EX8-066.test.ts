import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-066.js";

describe("EX8-066", () => {
  const source = { instanceId: "source", cardId: "EX8-066", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main memory gain and security play", () => {
    const module = getEffectModule("EX8-066")!;
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers the All Turns Ice-Snow play and digivolve watcher", () => {
    expect(module.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
