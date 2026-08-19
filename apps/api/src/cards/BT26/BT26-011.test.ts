import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./BT26-011.js";
import "../index.js";

describe("BT26-011 Buraimon", () => {
  it("exposes both On Play and When Digivolving trash-for-Draw 2 clauses", () => {
    expect(module.effectsForTiming(EffectTiming.OnPlay, {} as any)[0]?.description).toContain("Draw 2");
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as any)[0]?.description).toContain("Draw 2");
  });
});
