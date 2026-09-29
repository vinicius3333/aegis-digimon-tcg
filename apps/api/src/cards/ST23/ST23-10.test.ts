import { CARD_ID_VIEW_TAG, type CardInstance, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { buildStateView } from "../../engine/state/visibility.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./ST23-10.js";
import "./ST23-12.js";
import "./ST23-13.js";

describe("ST23-10 Pristimon", () => {
  it("places an exact hand card face down under a Glowing Dawn Tamer and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer" }],
          hand: [
            { card: "ST23-10", as: "gatomon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("tamer").stack.some((card) => card.instanceId === costId) && s.state.players[0]!.hand.length === 2,
    );
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.instanceId).toBe(costId);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-003")).toBe(true);
  });
  it("redirects a real player attack with inherited Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-02", as: "attacker" }] },
      1: { battleArea: [{ card: "ST5-06", as: "host", under: ["ST23-10"] }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      kind: "combatResolved",
      deletedPermanentIds: [attackerId],
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

async function placeUnderGlowingDawnTamer() {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "older", faceUp: false }] }],
        hand: [
          { card: "ST23-10", as: "pristimon" },
          { card: "ST23-12", as: "chiropmon" },
          { card: "BT1-009", as: "placed" },
        ],
        trash: [{ card: "ST23-03", as: "returnTarget" }],
        deck: ["BT1-002", "BT1-003", "BT1-004"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  const placedId = s.inst("placed").instanceId;
  preferInstanceIds.push(placedId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pristimon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").stack.length === 2 && s.state.players[0]!.deck.length === 1);
  return { s, placedId, olderId: s.inst("older").instanceId };
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

describe("ST23-10 Pristimon — KB Q&A rulings", () => {
  it("places the hand card below the face-down cards already under the Tamer (Q6181)", async () => {
    const { s, placedId, olderId } = await placeUnderGlowingDawnTamer();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, olderId]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);
  });

  it("keeps the face-down stacking order, so the bottom-card cost takes the card it placed (Q6182)", async () => {
    const { s, placedId, olderId } = await placeUnderGlowingDawnTamer();

    const offeredIds = await trashBottomCardWithChiropmon(s, placedId);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([olderId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === olderId)).toBe(false);
    expect(offeredIds).not.toContain(olderId);
  });

  it("lets only its owner look at the face-down card it placed under the Tamer (Q6183)", async () => {
    const { s, placedId } = await placeUnderGlowingDawnTamer();
    const placed = s.perm("tamer").stack.find((card) => card.instanceId === placedId)!;

    expect(seatsThatCanReadCard(s, placed)).toEqual([0]);
  });

  it("puts its face-down card face up in the trash when trashed from under the Tamer (Q6184)", async () => {
    const { s, placedId } = await placeUnderGlowingDawnTamer();

    await trashBottomCardWithChiropmon(s, placedId);

    const trashed = s.state.players[0]!.trash.find((card) => card.instanceId === placedId)!;
    expect(trashed.faceUp).toBe(true);
    expect(seatsThatCanReadCard(s, trashed)).toEqual([0, 1]);
  });
});
