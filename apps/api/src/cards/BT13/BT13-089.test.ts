import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-089.js";

describe("BT13-089 Ravemon", () => {
  it("uses the end-of-your-turn effect to delete first and defer Ravemon until the opponent's turn ends", () => {
    const module = getEffectModule("BT13-089");
    expect(module).toBeDefined();
    const effect = module!.effectsForTiming(EffectTiming.OnEndTurn, {
      cardId: "BT13-089",
      instanceId: "BT13-089#1",
      ownerSeat: 0,
      definition: {} as never,
    } as never)[0];
    expect(effect).toBeDefined();
    expect(effect!.description).toContain("at the end of your opponent's turn");
  });

  it("keeps the separate On Deletion play for Falcomon or Keenan Crier", () => {
    const module = getEffectModule("BT13-089");
    const effect = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, {
      cardId: "BT13-089",
      instanceId: "BT13-089#1",
      ownerSeat: 0,
      definition: {} as never,
    } as never)[0];
    expect(effect!.description).toContain("Falcomon or Keenan Crier");
  });
});
