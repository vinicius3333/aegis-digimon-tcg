import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./BT17-034.js";

describe("BT17-034 Bulkmon", () => {
  it("exposes the dual threshold When Digivolving effect", () => {
    const [effect] = module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never);
    expect(effect).toMatchObject({ description: expect.stringContaining("≥3 security") });
  });

  it("exposes the security-trash recovery and inherited Pulsemon DP effects", () => {
    const [recovery] = module.effectsForTiming(EffectTiming.OnDiscardSecurity, {} as never);
    expect(recovery).toMatchObject({ maxPerTurn: 1 });
    const [inherited] = module.effectsForTiming(EffectTiming.None, {} as never);
    expect(inherited).toMatchObject({ isInherited: true, description: expect.stringContaining("+1000 DP") });
  });
});
