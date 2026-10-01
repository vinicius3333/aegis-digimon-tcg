import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "./tamerStack.testSupport.js";

describe("ST24-04 Agumon", () => {
  it("reveals 3, adds and places DATA SQUAD cards, and returns the rest to deck bottom", () => {
    const compiled = registeredCompiledCards.get("ST24-04") ?? getCompiledCard("ST24-04")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] } },
          {
            count: 1,
            to: "placeUnder",
            faceDown: true,
            underFilter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("resolves both reveal dispositions against a real DATA SQUAD Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [{ card: "ST24-04", as: "agumon" }],
          deck: [
            { card: "ST24-02", as: "firstDataSquad" },
            { card: "ST24-03", as: "secondDataSquad" },
            { card: "BT1-090", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const firstId = s.inst("firstDataSquad").instanceId;
    const secondId = s.inst("secondDataSquad").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 1);

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const underIds = s.perm("tamer").stack.map(({ instanceId }) => instanceId);
    expect([...handIds, ...underIds]).toEqual(expect.arrayContaining([firstId, secondId]));
    expect(s.perm("tamer").stack[0]).toMatchObject({ faceUp: false });
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("rest").instanceId);
  });
});

function agumonBoard(deck: { card: string; as: string }[]) {
  return setupEngine(
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
        hand: [{ card: "ST24-04", as: "agumon" }],
        deck,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
  );
}

async function playAgumon(s: ReturnType<typeof agumonBoard>) {
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.hand.length === 1 && s.state.pendingDecision === undefined);
}

async function agumonPlacesUnderStackedTamer() {
  const s = agumonBoard([
    { card: "ST24-02", as: "firstDataSquad" },
    { card: "ST24-03", as: "secondDataSquad" },
    { card: "BT1-090", as: "rest" },
  ]);
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  const revealedIds = [s.inst("firstDataSquad").instanceId, s.inst("secondDataSquad").instanceId];
  await playAgumon(s);
  await settle(() => s.perm("tamer").stack.length === 3);
  const placedId = s.perm("tamer").stack.find(({ instanceId }) => revealedIds.includes(instanceId))!.instanceId;
  return { s, placedId, priorIds };
}

describe("ST24-04 Agumon — KB Q&A rulings", () => {
  it("adds the only revealed [DATA SQUAD] card to the hand and places nothing under the Tamer (Q6206)", async () => {
    const s = agumonBoard([
      { card: "ST24-02", as: "onlyDataSquad" },
      { card: "BT1-090", as: "firstRest" },
      { card: "BT1-091", as: "secondRest" },
    ]);
    const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
    const onlyDataSquadId = s.inst("onlyDataSquad").instanceId;

    await playAgumon(s);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([onlyDataSquadId]);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("firstRest").instanceId, s.inst("secondRest").instanceId].sort(),
    );
  });

  it("places the card at the bottom of a Tamer's existing face-down cards (Q6207)", async () => {
    const { s, placedId, priorIds } = await agumonPlacesUnderStackedTamer();

    expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
  });

  it("gives no chance to reorder the face-down cards, so a bottom-card cost takes the placed card (Q6208)", async () => {
    const { s, placedId, priorIds } = await agumonPlacesUnderStackedTamer();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { offeredInstanceIds, trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(offeredInstanceIds.filter((instanceId) => priorIds.includes(instanceId))).toEqual([]);
    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
  });

  it("lets only the owner look at the face-down card under the Tamer (Q6209)", async () => {
    const { s, placedId } = await agumonPlacesUnderStackedTamer();
    const placed = s.perm("tamer").stack.find(({ instanceId }) => instanceId === placedId)!;

    expect(identityVisibility(s, placed)).toEqual({ owner: true, opponent: false });
  });

  it("puts a trashed face-down card from under the Tamer face up in the trash (Q6210)", async () => {
    const { s, placedId } = await agumonPlacesUnderStackedTamer();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
  });
});
