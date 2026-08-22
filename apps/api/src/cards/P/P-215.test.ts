import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-215.js";

describe("P-215 Icemon", () => {
  it("exposes the inherited Blocker and shared placement protection effects", () => {
    const effects = getEffectModule("P-215")!.effectsForTiming(EffectTiming.None, {
      isOnBattleArea: () => true,
    } as any);
    expect(effects.map((effect) => effect.effectKey)).toEqual(["P-215/blocker"]);
    expect(effects[0]).toMatchObject({ isInherited: true });
  });

  it("fires the When Moving effect only when this Icemon moves into the battle area", () => {
    const source = { permanent: () => ({ permanentId: "icemon" }), isOnBattleArea: () => true } as any;
    const moving = getEffectModule("P-215")!.effectsForTiming(EffectTiming.OnMove, source)[0]!;
    expect(moving.canTrigger({ source, trigger: { movedPermanentId: "icemon" } } as any)).toBe(true);
    expect(moving.canTrigger({ source, trigger: { movedPermanentId: "other" } } as any)).toBe(false);
  });
});
