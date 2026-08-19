import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./BT26-006.js";
import "../index.js";

describe("BT26-006 Monimon", () => {
  it("exposes its inherited When Attacking effect with once-per-turn and optional play/use behavior", () => {
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, {} as any)[0]!;
    expect(effect).toMatchObject({ isInherited: true, optional: true, maxPerTurn: 1 });
    expect(effect.description).toContain("trashing any 2 digivolution cards");
    expect(effect.description).toContain("cost reduced by 2");
  });
});
