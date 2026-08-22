import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-168.js";

describe("P-168 Yao Qinglan", () => {
  it("registers Start of Main memory gain and Security self-play", () => {
    const module = getEffectModule("P-168")!;
    const source = { ownerSeat: 0, isOnBattleArea: () => true, isOwnersTurn: () => true } as never;
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("registers the Your Turn digivolution-card watcher with suspension activation", () => {
    const module = getEffectModule("P-168")!;
    const source = { ownerSeat: 0, isOnBattleArea: () => true, isOwnersTurn: () => true, permanent: () => ({ permanentId: "tamer" }) } as never;
    const effects = module.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.description).toContain("reduced by 1");
  });
});
