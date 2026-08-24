import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-067.js";
import "../index.js";

describe("BT26-067 Wizardmon", () => {
  it("draws then mandates one hand trash on play and digivolving", () => {
    expect(digivolutionRequirementsFor("BT26-067")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
      ]);
    }
  });

  it("returns itself before the optional reduced-cost red/blue Iliad trash play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          optional: true,
          cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
        },
      ],
    });
  });

  it("keeps Retaliation as an inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("publicly draws one and trashes one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-067", as: "wizardmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          hand: [{ card: "BT1-002", as: "discarded" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wizardmon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-002");
  });

  it("returns itself to the deck before playing a red Iliad from trash with cost reduced by 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT26-060", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const wizardId = s.perm("wizardmon").topCard.instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(wizardId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-060");
    expect(s.state.memory).toBe(8);
  });
});
