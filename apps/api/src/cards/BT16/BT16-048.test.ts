import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-048.js";

describe("BT16-048", () => {
  it("plays an Insectoid or Larva from hand with 8 cost reduction", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 8, optional: true }] });
  });

  it("is immune to opponent Digimon effects while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "permanent", condition: { kind: "selfIsSuspended" } }] });
  });

  it("bottom-decks an opposing Digimon using another suspended Digimon once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Return", to: "deckBottom", optional: true, abortOnDecline: true, cost: { kind: "suspend" } }] });
  });
});
