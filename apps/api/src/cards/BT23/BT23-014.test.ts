import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import module from "./BT23-014.js";

const source = { isOnBattleArea: () => true } as any;

describe("BT23-014 Gallantmon", () => {
  it("installs floodgate and deletion effects on play and when digivolving", () => {
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(2);
  });

  it("installs only the deletion effect when attacking", () => {
    const effects = module.effectsForTiming(EffectTiming.OnAllyAttack, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]?.description).toContain("Delete 1 of your opponent's Digimon");
  });
});
