import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "./tamerStack.testSupport.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST24-14 Yoshino & Keenan", () => {
  it("on play places the deck top face down under the Tamer and gains memory for an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === -3);
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-14");
    expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
    expect(s.state.memory).toBe(-3);
  });

  it("does not gain memory from an opponent's Tamer alone", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] },
        1: { battleArea: [{ card: "ST24-13", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory < 0);
    expect(s.state.memory).toBe(-4);
  });

  it("suspends exactly one opponent Digimon when this Tamer's stacked card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-14", as: "tamer", under: [{ card: "BT1-001", as: "underCard", faceUp: false }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentTarget" },
            { card: "BT1-010", as: "opponentOther" },
            { card: "ST24-13", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamer = s.perm("tamer");
    const underCardId = s.inst("underCard").instanceId;
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(tamer.permanentId, [underCardId], { byEffectSeat: 0 });
    await settle(() => tamer.isSuspended && s.perm("opponentTarget").isSuspended);

    expect(tamer.isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.perm("opponentOther").isSuspended).toBe(false);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
  });

  it("does not trigger when effects trash a card under a different permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-14", as: "tamer" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-001", as: "otherUnder" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherHost = s.perm("otherHost");
    await s.engine.recomputeContinuousEffects();
    await primitivesOf(s).trashDigivolutionCards(otherHost.permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});

async function yoshinoPlacesUnderOwnStack() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          {
            card: "ST24-14",
            as: "tamer",
            under: [
              { card: "BT1-001", as: "priorBottom", faceUp: false },
              { card: "BT1-002", as: "priorTop", faceUp: false },
            ],
          },
        ],
        // A seat with no legal main action is auto-passed; Falcomon keeps Main open.
        hand: ["ST24-12"],
        deck: [{ card: "BT1-003", as: "placed" }, "BT1-004", "BT1-005"],
      },
      1: { deck: ["BT1-006", "BT1-007"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const placedId = s.inst("placed").instanceId;
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop, placedId, priorIds };
}

async function concede(s: EngineSetup, loop: Promise<unknown>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("ST24-14 Yoshino Fujieda & Keenan Crier — KB Q&A rulings", () => {
  it("places the card at the bottom of a Tamer's existing face-down cards (Q6228)", async () => {
    const { s, loop, placedId, priorIds } = await yoshinoPlacesUnderOwnStack();

    expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
    await concede(s, loop);
  });

  it("gives no chance to reorder the face-down cards, so a bottom-card cost takes the placed card (Q6229)", async () => {
    const { s, loop, placedId, priorIds } = await yoshinoPlacesUnderOwnStack();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { offeredInstanceIds, trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(offeredInstanceIds.filter((instanceId) => priorIds.includes(instanceId))).toEqual([]);
    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    await concede(s, loop);
  });

  it("lets only the owner look at the face-down card under the Tamer (Q6230)", async () => {
    const { s, loop, placedId } = await yoshinoPlacesUnderOwnStack();
    const placed = s.perm("tamer").stack.find(({ instanceId }) => instanceId === placedId)!;

    expect(identityVisibility(s, placed)).toEqual({ owner: true, opponent: false });
    await concede(s, loop);
  });

  it("puts a trashed face-down card from under the Tamer face up in the trash (Q6231)", async () => {
    const { s, loop, placedId } = await yoshinoPlacesUnderOwnStack();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, cardId: "BT1-003", faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await concede(s, loop);
  });
});
