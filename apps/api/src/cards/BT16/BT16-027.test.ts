import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-027.js";

describe("BT16-027", () => {
  it("bottom-decks an opposing Digimon with an equal-or-smaller stack", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: expect.objectContaining({ count: 1 }) });
    }
  });

  it("unsuspends once per turn and optionally bottom-decks a suspended opponent", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfAttack", frequency: "OncePerTurn" });
    expect(compiled.effects?.[3]?.actions?.[0]).toMatchObject({ kind: "Unsuspend" });
    expect(compiled.effects?.[3]?.actions?.[1]).toMatchObject({ kind: "Return", to: "deckBottom", condition: { kind: "selfDigivolutionStackHasTrait" } });
  });
});
