import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { buildStateView } from "../../engine/state/visibility.js";
import "./BT13-092.js";
import "./BT13-089.js";
import "./BT13-102.js";
import "../BT11/BT11-088.js";
import "../BT14/BT14-075.js";

const encoders = new WeakMap<GameState, Encoder<GameState>>();
function projection(s: EngineSetup, seat: Seat | undefined) {
  let encoder = encoders.get(s.state);
  if (!encoder) {
    encoder = new Encoder(s.state);
    encoders.set(s.state, encoder);
  }
  const view = buildStateView(s.state, seat);
  const iterator = { offset: 0 };
  encoder.encodeAll(iterator);
  const offset = iterator.offset;
  const decoder = new Decoder(new GameState());
  decoder.decode(encoder.encodeAllView(view, offset, iterator));
  return decoder.state;
}

async function burst(seat: Seat, handSize = 2, securitySize = 2) {
  const opponent: Seat = seat === 0 ? 1 : 0;
  const s = setupEngine({
    [seat]: {
      battleArea: [
        { card: "BT13-089", as: "host" },
        { card: "BT13-102", as: "keenan" },
      ],
      hand: [{ card: "BT13-092", as: "burst" }],
    },
    [opponent]: {
      hand: Array.from({ length: handSize }, (_, i) => ({
        card: i === 1 ? "BT1-010" : "BT1-009",
        as: `hand-${i}`,
        faceUp: false,
      })),
      security: Array.from({ length: securitySize }, (_, i) => ({ card: "ST1-07", as: `security-${i}` })),
    },
  });
  s.state.turnSeat = seat;
  s.state.memory = 3;
  await s.ready();
  expect(projection(s, seat).players[opponent]!.hand).toHaveLength(0);
  expect(projection(s, undefined).players[opponent]!.hand).toHaveLength(0);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(
    s.engine.applyIntent(seat, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("burst").instanceId,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  return { s, opponent };
}

async function choose(s: EngineSetup, seat: Seat, selected: string) {
  const request = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "selectCards", instanceIds: [selected] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
}

describe("Discord 1557873736131154071: authorized opponent hand search", () => {
  it.each([0, 1] as const)("seat %s sees identities privately and resolves the exact accepted choice", async (seat) => {
    const { s, opponent } = await burst(seat);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = JSON.parse(JSON.stringify(s.decisions.at(-1)!.req));
    expect(request.seat).toBe(seat);
    expect(request.options.visibleCards).toEqual([
      { instanceId: s.inst("hand-0").instanceId, cardId: "BT1-009" },
      { instanceId: s.inst("hand-1").instanceId, cardId: "BT1-010" },
    ]);
    expect(JSON.parse(projection(s, seat).pendingDecision!.payloadJson).visibleCards).toEqual(
      request.options.visibleCards,
    );
    for (const viewer of [opponent, undefined]) {
      const state = projection(s, viewer);
      expect(state.pendingDecision?.payloadJson).toBe("");
      expect(state.players[seat]!.hand).toHaveLength(0);
    }
    expect(projection(s, undefined).players[opponent]!.hand).toHaveLength(0);
    expect(projection(s, seat).players[opponent]!.hand).toHaveLength(0);
    const decisionId = request.decisionId;
    for (const [responder, ids] of [
      [opponent, [s.inst("hand-1").instanceId]],
      [seat, [s.inst("security-0").instanceId]],
      [seat, []],
    ] as const) {
      expect(
        s.engine.applyIntent(responder, {
          type: "respondDecision",
          decisionId,
          response: { kind: "selectCards", instanceIds: [...ids] },
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.pendingDecision?.decisionId).toBe(decisionId);
    }
    await choose(s, seat, s.inst("hand-1").instanceId);
    expect(s.state.players[opponent]!.trash.map((c) => c.instanceId)).toContain(s.inst("hand-1").instanceId);
    expect(s.state.players[opponent]!.hand.map((c) => c.instanceId)).toEqual([
      s.inst("hand-0").instanceId,
      s.inst("security-0").instanceId,
    ]);
    expect(s.state.players[opponent]!.security).toHaveLength(1);
    expect(
      s.decisions.some((d) =>
        d.req.options?.visibleCards?.some((c) => c.instanceId === s.inst("security-0").instanceId),
      ),
    ).toBe(false);
    expect(s.events.some((e) => e.kind === "cardRevealed" || e.kind === "securityRevealed")).toBe(false);
    expect(projection(s, seat).players[opponent]!.hand).toHaveLength(0);
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("hand-0").instanceId] },
      }),
    ).toMatchObject({ ok: false });
  });

  it.each([0, 1] as const)("seat %s checks seven AFTER trash, handles eight and empty zones", async (seat) => {
    for (const [handSize, securitySize, expectedSecurity] of [
      [8, 2, 1],
      [9, 2, 2],
      [2, 0, 0],
      [1, 2, 1],
      [0, 2, 1],
      [0, 0, 0],
    ] as const) {
      const { s, opponent } = await burst(seat, handSize, securitySize);
      if (handSize > 1) {
        await settle(() => s.state.pendingDecision?.kind === "selectCards");
        await choose(s, seat, s.inst("hand-1").instanceId);
      } else await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.players[opponent]!.security).toHaveLength(expectedSecurity);
      expect(s.state.players[opponent]!.hand).toHaveLength(Math.max(0, handSize - 1) + securitySize - expectedSecurity);
    }
  });

  it.each([0, 1] as const)("sweep BT11-088 seat %s privately looks before trashing", async (seat) => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine({
      [seat]: { battleArea: [{ card: "BT13-085", as: "host" }], hand: [{ card: "BT11-088", as: "bagra" }] },
      [opponent]: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        hand: [
          { card: "BT1-009", as: "first", faceUp: false },
          { card: "BT1-010", as: "second", faceUp: false },
        ],
      },
    });
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(seat, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("bagra").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)!.req.options?.visibleCards?.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-010"]);
    await choose(s, seat, s.inst("second").instanceId);
    expect(s.state.players[opponent]!.trash.map((c) => c.instanceId)).toContain(s.inst("second").instanceId);
  });

  it.each([0, 1] as const)("blind BT14-075 seat %s still conceals the hand", async (seat) => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine({
      [seat]: { battleArea: [{ card: "BT14-075", as: "ogre" }] },
      [opponent]: {
        battleArea: [{ card: "ST1-11", as: "target", suspended: true }],
        hand: [
          { card: "BT1-009", as: "first", faceUp: false },
          { card: "BT1-010", as: "second", faceUp: false },
        ],
      },
    });
    s.state.turnSeat = seat;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(seat, {
        type: "attack",
        attackerPermanentId: s.perm("ogre").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)!.req.options?.visibleCards ?? []).toEqual([]);
    expect(s.decisions.at(-1)!.req.options?.visibleInstanceIds).toEqual([]);
    await choose(s, seat, s.inst("second").instanceId);
    expect(s.state.players[opponent]!.trash.map((c) => c.instanceId)).toContain(s.inst("second").instanceId);
  });
});
