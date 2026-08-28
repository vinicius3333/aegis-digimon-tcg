import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT16-060.js";
import "../index.js";

describe("BT16-060 Tankdramon IR", () => {
  it("scales each play-cost reduction from matching revealed cards", () => {
    const reductions = compiled.effects
      .flatMap((effect) => effect.actions)
      .filter((action) => action.kind === "CostModifier");

    expect(reductions).toHaveLength(2);
    for (const reduction of reductions) {
      expect(reduction).toMatchObject({
        kind: "CostModifier",
        mode: "reduce",
        costType: "play",
        amount: 1,
        existingPermanent: true,
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
          count: "all",
        },
        duration: "forTheTurn",
      });
      expect(reduction.scaling?.unit).toBe("cards");
      expect(reduction.scaling?.filter?.zone).toBe("revealed");
    }
    expect(irNode(compiled.effects[0]?.actions[0])?.rest).toBe("deckTopOrBottom");
    expect(irNode(compiled.effects[1]?.actions[0])?.rest).toBe("deckTopOrBottom");
  });

  it("naturally reveals, scales existing opponent costs, returns the reveal, then deletes at the reduced cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-060", as: "tank" }],
          deck: [
            { card: "BT16-050", as: "revealedTraitOne" },
            { card: "BT16-050", as: "revealedTraitTwo" },
            { card: "BT1-009", as: "revealedNonTrait" },
            { card: "BT1-009", as: "unrevealed" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "reducedTarget" },
            { card: "BT1-022", as: "unreducedTarget" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("reducedTarget").permanentId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-020"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-022"]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT16-050", "BT16-050", "BT1-009", "BT1-009"]),
    );
  });

  it("naturally de-digivolves one opponent when another own D-Brigade/DigiPolice Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-050", as: "command" }],
          battleArea: [{ card: "BT16-060", as: "tank", under: ["BT1-009"] }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target", under: ["BT1-009"] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("command").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");

    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
