import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import module from "./BT23-021.js";

const source = {} as any;

describe("BT23-021 Dosukomon", () => {
  it("shares one Once Per Turn link effect across digivolving and attacking", () => {
    const digivolving = module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0] as any;
    const attacking = module.effectsForTiming(EffectTiming.OnUseAttack, source)[0] as any;
    expect(digivolving).toMatchObject({ effectKey: "BT23-021/link-wd-wa", maxPerTurn: 1, optional: true });
    expect(attacking).toMatchObject({ effectKey: "BT23-021/link-wd-wa", maxPerTurn: 1, optional: true });
  });

  it("installs only the printed Your Turn linked battle-deletion immunity", () => {
    const effects = module.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ effectKey: "BT23-021/when-linked-battle-immunity-yt", maxPerTurn: 1 });
  });
});
