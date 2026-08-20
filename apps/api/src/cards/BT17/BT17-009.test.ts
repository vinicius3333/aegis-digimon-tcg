import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-009.js";

describe("BT17-009", () => {
  it("reveals three and adds a Hybrid/Ten Warriors card or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });
  });

  it("plays an inherited-effect Tamer from hand on deletion as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }] });
  });
});
