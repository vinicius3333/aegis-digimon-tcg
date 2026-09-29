import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "./tamerStack.testSupport.js";

describe("ST24-02 Gaomon", () => {
  it("places exactly one hand card under a DATA SQUAD Tamer to draw 2", () => {
    const compiled = registeredCompiledCards.get("ST24-02") ?? getCompiledCard("ST24-02")!;
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          cost: {
            kind: "place",
            target: { count: 1, from: ["hand"] },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("places the paid hand card face down under the DATA SQUAD Tamer and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [
            { card: "ST24-02", as: "gaomon" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === costId));

    expect(s.perm("tamer").stack).toContainEqual(expect.objectContaining({ instanceId: costId, faceUp: false }));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-002", "BT1-003"]),
    );
  });
});

async function gaomonPlacesUnderStackedTamer() {
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
        hand: [
          { card: "ST24-02", as: "gaomon" },
          { card: "BT1-003", as: "placed" },
        ],
        deck: ["BT1-004", "BT1-005"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const placedId = s.inst("placed").instanceId;
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === placedId));
  await settle(() => s.state.pendingDecision === undefined);
  return { s, placedId, priorIds };
}

describe("ST24-02 Gaomon — KB Q&A rulings", () => {
  it("places the card at the bottom of a Tamer's existing face-down cards (Q6198)", async () => {
    const { s, placedId, priorIds } = await gaomonPlacesUnderStackedTamer();

    expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
  });

  it("gives no chance to reorder the face-down cards, so a bottom-card cost takes the placed card (Q6199)", async () => {
    const { s, placedId, priorIds } = await gaomonPlacesUnderStackedTamer();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { offeredInstanceIds, trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(offeredInstanceIds.filter((instanceId) => priorIds.includes(instanceId))).toEqual([]);
    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
  });

  it("lets only the owner look at the face-down card under the Tamer (Q6200)", async () => {
    const { s } = await gaomonPlacesUnderStackedTamer();

    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
  });

  it("puts a trashed face-down card from under the Tamer face up in the trash (Q6201)", async () => {
    const { s, placedId } = await gaomonPlacesUnderStackedTamer();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, cardId: "BT1-003", faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
  });
});
