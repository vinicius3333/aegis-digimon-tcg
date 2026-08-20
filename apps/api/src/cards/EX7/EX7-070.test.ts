import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-070.js";

describe("EX7-070", () => {
  const source = { instanceId: "source", cardId: "EX7-070", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers Main, Security, and digivolution-card discard effects", () => {
    const module = getEffectModule("EX7-070")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
