import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "./tamerStack.testSupport.js";

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

async function gaogamonPlacesUnderStackedTamer() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          {
            card: "ST24-13",
            as: "tamer",
            under: [
              { card: "BT1-001", as: "priorBottom", faceUp: false },
              { card: "BT1-002", as: "priorTop", faceUp: false },
            ],
          },
        ],
        hand: [{ card: "ST24-03", as: "gaogamon" }],
        deck: [{ card: "BT1-003", as: "placed" }, "BT1-004"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const placedId = s.inst("placed").instanceId;
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === placedId));
  await settle(() => s.state.pendingDecision === undefined);
  return { s, placedId, priorIds };
}

describe("ST24-03 Gaogamon — KB Q&A rulings", () => {
  it("places the card at the bottom of a Tamer's existing face-down cards (Q6202)", async () => {
    const { s, placedId, priorIds } = await gaogamonPlacesUnderStackedTamer();

    expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
  });

  it("gives no chance to reorder the face-down cards, so a bottom-card cost takes the placed card (Q6203)", async () => {
    const { s, placedId, priorIds } = await gaogamonPlacesUnderStackedTamer();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { offeredInstanceIds, trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(offeredInstanceIds.filter((instanceId) => priorIds.includes(instanceId))).toEqual([]);
    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
  });

  it("lets only the owner look at the face-down card under the Tamer (Q6204)", async () => {
    const { s, placedId } = await gaogamonPlacesUnderStackedTamer();
    const placed = s.perm("tamer").stack.find(({ instanceId }) => instanceId === placedId)!;

    expect(identityVisibility(s, placed)).toEqual({ owner: true, opponent: false });
  });

  it("puts a trashed face-down card from under the Tamer face up in the trash (Q6205)", async () => {
    const { s, placedId } = await gaogamonPlacesUnderStackedTamer();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
  });
});
