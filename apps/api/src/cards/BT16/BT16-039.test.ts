import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-039.js";

describe("BT16-039", () => {
  it("reveals four and adds Pulsemon text cards and Abadin Electronics", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });
  });

  it("grants inherited DP while its top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }] });
  });
});
