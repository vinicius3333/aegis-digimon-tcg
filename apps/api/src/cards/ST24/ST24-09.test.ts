import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "./tamerStack.testSupport.js";

describe("ST24-09 Sunflowmon", () => {
  it("may suspend an opposing Digimon or Tamer, then places the deck top face down under a DATA SQUAD Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-09") ?? getCompiledCard("ST24-09")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      });
      expect(actions?.[1]).toMatchObject({
        kind: "PlaceUnder",
        fromDeckTop: true,
        optional: true,
        underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });

  it("suspends the chosen opponent and places the deck top face down under the Tamer on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [{ card: "ST24-09", as: "sunflowmon" }],
          deck: [{ card: "BT1-001", as: "deckTop" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deckTopId = s.inst("deckTop").instanceId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunflowmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === deckTopId));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("tamer").stack).toContainEqual(expect.objectContaining({ instanceId: deckTopId, faceUp: false }));
  });
});

async function sunflowmonPlacesUnderStackedTamer() {
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
        hand: [{ card: "ST24-09", as: "sunflowmon" }],
        deck: [{ card: "BT1-003", as: "placed" }, "BT1-004"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const placedId = s.inst("placed").instanceId;
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunflowmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === placedId));
  await settle(() => s.state.pendingDecision === undefined);
  return { s, placedId, priorIds };
}

describe("ST24-09 Sunflowmon — KB Q&A rulings", () => {
  it("places the card at the bottom of a Tamer's existing face-down cards (Q6217)", async () => {
    const { s, placedId, priorIds } = await sunflowmonPlacesUnderStackedTamer();

    expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
  });

  it("gives no chance to reorder the face-down cards, so a bottom-card cost takes the placed card (Q6218)", async () => {
    const { s, placedId, priorIds } = await sunflowmonPlacesUnderStackedTamer();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { offeredInstanceIds, trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(offeredInstanceIds.filter((instanceId) => priorIds.includes(instanceId))).toEqual([]);
    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
  });

  it("lets only the owner look at the face-down card under the Tamer (Q6219)", async () => {
    const { s, placedId } = await sunflowmonPlacesUnderStackedTamer();
    const placed = s.perm("tamer").stack.find(({ instanceId }) => instanceId === placedId)!;

    expect(identityVisibility(s, placed)).toEqual({ owner: true, opponent: false });
  });

  it("puts a trashed face-down card from under the Tamer face up in the trash (Q6220)", async () => {
    const { s, placedId } = await sunflowmonPlacesUnderStackedTamer();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
  });
});
