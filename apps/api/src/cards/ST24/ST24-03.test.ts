import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-03 Gaogamon", () => {
  it("returns an opposing level 3 Digimon and places the deck top face down under a DATA SQUAD Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-03") ?? getCompiledCard("ST24-03")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
        to: "hand",
      });
      expect(actions?.[1]).toMatchObject({
        kind: "PlaceUnder",
        fromDeckTop: true,
        optional: true,
        underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
      });
    }
  });

  it("executes both on-play clauses with the exact level boundary and face-down placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [{ card: "ST24-03", as: "gaogamon" }],
          deck: [{ card: "BT1-001", as: "deckTop" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelThree" },
            { card: "BT1-015", as: "levelFour" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const levelThreeId = s.perm("levelThree").topCard.instanceId;
    const levelFourId = s.perm("levelFour").permanentId;
    const deckTopId = s.inst("deckTop").instanceId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === deckTopId));

    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === levelThreeId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFourId)).toBe(true);
    expect(s.perm("tamer").stack).toContainEqual(expect.objectContaining({ instanceId: deckTopId, faceUp: false }));
  });
});
