import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-038.js";

describe("EX11-038 Sunarizamon", () => {
  it("registers its On Play Mineral/Rock trash cost and Draw 1 effect", () => {
    const source = {
      cardId: "EX11-038", ownerSeat: 0, definition: {}, permanent: () => undefined,
      isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true,
    } as never;
    const effect = getEffectModule("EX11-038")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.effectKey).toContain("EX11-038");
    expect(effect.description).toMatch(/Draw 1/i);
  });
});
