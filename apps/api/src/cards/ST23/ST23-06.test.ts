import { CARD_ID_VIEW_TAG, type CardInstance, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { buildStateView } from "../../engine/state/visibility.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-06.js";
import "./ST23-12.js";
import "./ST23-13.js";

describe("ST23-06 Gekkomon", () => {
  it("reveals three, adds one Glowing Dawn card, and places another face down under its Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer" }],
          hand: [{ card: "ST23-06", as: "gekkomon" }],
          deck: ["ST23-02", "ST23-03", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("tamer").stack.length === 1 &&
        s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03"),
    );
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03")).toBe(true);
  });

  it("uses inherited Piercing after winning a real unequal-DP attack against an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-07", as: "host", under: ["ST23-06"] }] },
        1: { battleArea: [{ card: "ST1-02", as: "target", suspended: true }], security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    const combat = s.events.find((event) => event.kind === "combatResolved");
    expect(combat).toMatchObject({ kind: "combatResolved", deletedPermanentIds: [targetId] });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("ST23-06 Gekkomon — KB Q&A rulings", () => {
  it("adds the only revealed Glowing Dawn card to hand and places nothing under the Tamer (Q6169)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "existing", faceUp: false }] }],
          hand: [{ card: "ST23-06", as: "gekkomon" }],
          deck: ["ST23-02", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const existingId = s.inst("existing").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST23-02"]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([existingId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });
});

async function placeUnderGlowingDawnTamer() {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "older", faceUp: false }] }],
        hand: [
          { card: "ST23-06", as: "gekkomon" },
          { card: "ST23-12", as: "chiropmon" },
        ],
        trash: [{ card: "ST23-03", as: "returnTarget" }],
        deck: ["ST23-02", "ST23-10", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.inst("returnTarget").instanceId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").stack.length === 2);
  const placed = s.perm("tamer").stack[0]!;
  expect(["ST23-02", "ST23-10"]).toContain(placed.cardId);
  return { s, placedId: placed.instanceId, olderId: s.inst("older").instanceId };
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

describe("ST23-06 Gekkomon — KB Q&A rulings (face-down cards under Tamers)", () => {
  it("places the revealed card below the face-down cards already under the Tamer (Q6170)", async () => {
    const { s, placedId, olderId } = await placeUnderGlowingDawnTamer();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, olderId]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);
  });

  it("keeps the face-down stacking order, so the bottom-card cost takes the card it placed (Q6171)", async () => {
    const { s, placedId, olderId } = await placeUnderGlowingDawnTamer();

    const offeredIds = await trashBottomCardWithChiropmon(s, placedId);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([olderId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === olderId)).toBe(false);
    expect(offeredIds).not.toContain(olderId);
  });

  it("lets only its owner look at the face-down card it placed under the Tamer (Q6172)", async () => {
    const { s, placedId } = await placeUnderGlowingDawnTamer();
    const placed = s.perm("tamer").stack.find((card) => card.instanceId === placedId)!;

    expect(seatsThatCanReadCard(s, placed)).toEqual([0]);
  });

  it("puts its face-down card face up in the trash when trashed from under the Tamer (Q6173)", async () => {
    const { s, placedId } = await placeUnderGlowingDawnTamer();

    await trashBottomCardWithChiropmon(s, placedId);

    const trashed = s.state.players[0]!.trash.find((card) => card.instanceId === placedId)!;
    expect(trashed.faceUp).toBe(true);
    expect(seatsThatCanReadCard(s, trashed)).toEqual([0, 1]);
  });
});
