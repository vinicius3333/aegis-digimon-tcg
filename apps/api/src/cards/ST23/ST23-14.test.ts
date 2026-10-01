import { CARD_ID_VIEW_TAG, type CardInstance, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { buildStateView } from "../../engine/state/visibility.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-14.js";
import "./ST23-12.js";

describe("ST23-14 Reina Sakuya & Makoto Kuonji", () => {
  it("suspends itself and grants Jamming to an exact Glowing Dawn Digimon when its under-card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
          ],
          hand: [{ card: "ST23-12", as: "liollmon" }],
          trash: [{ card: "ST23-03", as: "returnTarget" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const underId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      return s.state.players[0]!.trash.some((card) => card.instanceId === underId) && s.perm("tamer").isSuspended;
    });

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(true);
  });

  it("does not react when an effect trashes a card under another permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer" },
            { card: "ST23-11", as: "glowing" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-001", as: "otherUnder" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const primitives = (s.engine as unknown as { primitives: Primitives }).primitives;

    await primitives.trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(false);
  });

  it("uses the granted Jamming to survive a security Digimon battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
          ],
          hand: [{ card: "ST23-12", as: "trigger" }],
          trash: [{ card: "ST23-03", as: "returnTarget" }],
        },
        1: { security: ["ST1-10"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("glowing").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("glowing").permanentId)).toBe(true);
  });
});

async function placeUnderTamerAtStartOfMain() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", as: "older", faceUp: false }] }],
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

describe("ST23-14 Reina Sakuya & Makoto Kuonji — KB Q&A rulings", () => {
  it("places the deck card below the face-down cards already under this Tamer (Q6190)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, olderId]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("keeps the face-down stacking order, so the bottom-card cost takes the card it placed (Q6191)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    const offeredIds = await trashBottomCardWithChiropmon(s, placedId);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([olderId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === olderId)).toBe(false);
    expect(offeredIds).not.toContain(olderId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("lets only its owner look at the face-down card placed under this Tamer (Q6192)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();
    const placed = s.perm("tamer").stack.find((card) => card.instanceId === placedId)!;

    expect(seatsThatCanReadCard(s, placed)).toEqual([0]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("puts a trashed face-down card from under this Tamer face up in the trash (Q6193)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();

    await trashBottomCardWithChiropmon(s, placedId);

    const trashed = s.state.players[0]!.trash.find((card) => card.instanceId === placedId)!;
    expect(trashed.faceUp).toBe(true);
    expect(seatsThatCanReadCard(s, trashed)).toEqual([0, 1]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
