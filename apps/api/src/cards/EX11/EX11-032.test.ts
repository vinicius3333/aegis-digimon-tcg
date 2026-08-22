import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-032.js";
describe("EX11-032 GrandGalemon", () => {
  it("registers its hand Main effect as executable IR", () => {
    const source = { instanceId: "source", cardId: "EX11-032", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX11-032")!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(1);
  });
});
