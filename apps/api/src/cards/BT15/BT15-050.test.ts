import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-050.js";

describe("BT15-050", () => {
  it("reveals four to add up to two level 6 or higher cards", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2 }] }] }));
  it("may delete a Digimon to play a Dark Masters into breeding at end of turn", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfYourTurn", actions: [{ kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true }] }));
});
