import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-037.js";

describe("BT16-037", () => {
  it("reveals four and adds an Insectoid", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1, to: "hand" }] }] });
  });

  it("grants inherited DP while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }] });
  });
});
