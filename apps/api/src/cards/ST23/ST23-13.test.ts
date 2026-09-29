import { CARD_ID_VIEW_TAG, type CardInstance, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { buildStateView } from "../../engine/state/visibility.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./ST23-12.js";
import "./ST23-13.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST23-13 Tomoro Tenma & Kyo Sawashiro", () => {
  it("places the exact deck-top card face down under itself and gains memory when the opponent has a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST23-13", as: "tamer" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-002"] },
      },
      { autoAcceptOptional: true },
    );
    const deckTopId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (perm) =>
            perm.topCard?.instanceId === s.inst("tamer").instanceId &&
            perm.stack.some((card) => card.instanceId === deckTopId),
        ) && s.state.memory === 7,
    );
    const playedTamer = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId,
    )!;
    expect(playedTamer.stack).toHaveLength(1);
    expect(playedTamer.stack[0]!.instanceId).toBe(deckTopId);
    expect(playedTamer.stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("still gains mandatory memory when the optional deck-top placement is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST23-13", as: "tamer" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("reacts only when an effect trashes a card from under this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "ownUnder", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-002", as: "otherUnder" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("glowing").currentDP).toBe(4000);

    await primitivesOf(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("ownUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.perm("tamer").isSuspended && s.perm("glowing").currentDP === 7000);
    expect(s.perm("glowing").currentDP).toBe(7000);
  });
});

async function placeUnderTamerAtStartOfMain() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "older", faceUp: false }] }],
        hand: [{ card: "ST23-12", as: "chiropmon" }],
        trash: [{ card: "ST23-03", as: "returnTarget" }],
        deck: ["BT1-002", { card: "BT1-009", as: "placed" }, "BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-002"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  s.state.isFirstPlayersFirstTurn = false;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  return { s, turn, placedId: s.inst("placed").instanceId, olderId: s.inst("older").instanceId };
}

function seatsThatCanReadCard(s: EngineSetup, card: CardInstance): Seat[] {
  // eslint-disable-next-line no-new -- constructing the Encoder wires the schema root so per-seat views can be built.
  new Encoder(s.state);
  return ([0, 1] as const).filter((seat) => buildStateView(s.state, seat).hasTag(card, CARD_ID_VIEW_TAG));
}

async function trashBottomCardWithChiropmon(s: EngineSetup, placedId: string): Promise<string[]> {
  const decisionsBefore = s.decisions.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chiropmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === placedId));
  return s.decisions.slice(decisionsBefore).flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
}

describe("ST23-13 Tomoro Tenma & Kyo Sawashiro — KB Q&A rulings", () => {
  it("places the deck card below the face-down cards already under this Tamer (Q6186)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, olderId]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("keeps the face-down stacking order, so the bottom-card cost takes the card it placed (Q6187)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    const offeredIds = await trashBottomCardWithChiropmon(s, placedId);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([olderId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === olderId)).toBe(false);
    expect(offeredIds).not.toContain(olderId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("lets only its owner look at the face-down card placed under this Tamer (Q6188)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();
    const placed = s.perm("tamer").stack.find((card) => card.instanceId === placedId)!;

    expect(seatsThatCanReadCard(s, placed)).toEqual([0]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("puts a trashed face-down card from under this Tamer face up in the trash (Q6189)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();

    await trashBottomCardWithChiropmon(s, placedId);

    const trashed = s.state.players[0]!.trash.find((card) => card.instanceId === placedId)!;
    expect(trashed.faceUp).toBe(true);
    expect(seatsThatCanReadCard(s, trashed)).toEqual([0, 1]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
