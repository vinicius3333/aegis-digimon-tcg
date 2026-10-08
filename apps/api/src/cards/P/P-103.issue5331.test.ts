import { describe, expect, it } from "vitest";
import type { DecisionResponse, Seat } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./P-103.js";
import "../BT21/BT21-019.js";

function answer(s: EngineSetup, seat: Seat, response: DecisionResponse) {
  const pending = s.state.pendingDecision!;
  expect(pending).toBeDefined();
  expect(s.engine.applyIntent(seat, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
    ok: true,
  });
}

async function fixture(seat: Seat, count: number, search = false) {
  const other: Seat = seat === 0 ? 1 : 0;
  const s = setupEngine(
    {
      [seat]: {
        battleArea: [
          { card: "P-103", as: "delay" },
          { card: "BT1-009", as: "host" },
        ],
        hand: [
          ...Array.from({ length: count }, (_, i) => ({ card: "BT1-016", as: `own-${i}` })),
          { card: "BT1-021", as: "wrong-level" },
          { card: "BT1-037", as: "wrong-color" },
          ...(search ? [{ card: "P-103", as: "main" }] : []),
        ],
        deck: [{ card: "BT1-015", as: "searched" }, { card: "BT1-016", as: "search-other" }, "BT1-009"],
      },
      [other]: {
        hand: [{ card: "BT21-019", as: "opponent-betel" }],
        battleArea: [{ card: "BT21-019", as: "opponent-board" }],
      },
    },
    { autoAcceptOptional: true },
  );
  s.state.turnSeat = seat;
  s.state.turnCount = 2;
  s.state.memory = 10;
  await s.ready();
  return { s, other };
}

async function useMainSearch(s: EngineSetup, seat: Seat) {
  expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("main").instanceId })).toEqual({ ok: true });
  await settle();
  const req = s.decisions.at(-1)!.req;
  expect(req.kind).toBe("selectCards");
  expect(req.options?.candidateInstanceIds).toEqual([s.inst("searched").instanceId, s.inst("search-other").instanceId]);
  answer(s, seat, { kind: "selectCards", instanceIds: [s.inst("searched").instanceId] });
  await settle();
  expect(s.state.players[seat]!.hand.some((card) => card.instanceId === s.inst("searched").instanceId)).toBe(true);
  expect(s.state.pendingDecision).toBeUndefined();
}

async function activate(s: EngineSetup, seat: Seat) {
  const abilities = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
  expect(abilities).toHaveLength(1);
  expect(
    s.engine.applyIntent(seat, {
      type: "activateEffect",
      sourceInstanceId: s.inst("delay").instanceId,
      effectKey: abilities[0]!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle();
}

function opponentUnchanged(s: EngineSetup, other: Seat) {
  expect(s.state.players[other]!.hand.map((c) => c.instanceId)).toEqual([s.inst("opponent-betel").instanceId]);
  expect(s.perm("opponent-board").topCard.cardId).toBe("BT21-019");
}

describe.each([0, 1] as const)("#5331 P-103 hand ownership, seat %s", (seat) => {
  it.each([false, true])("offers only own legal destinations, after Main search=%s", async (search) => {
    const { s, other } = await fixture(seat, 2, search);
    if (search) await useMainSearch(s, seat);
    await activate(s, seat);
    const req = s.decisions.at(-1)!.req;
    expect(req.kind).toBe("selectCards");
    expect(req.seat).toBe(seat);
    const expected = [
      s.inst("own-0").instanceId,
      s.inst("own-1").instanceId,
      ...(search ? [s.inst("searched").instanceId] : []),
    ];
    expect(req.options!.candidateInstanceIds).toEqual(expected);
    expect(req.options!.visibleInstanceIds).not.toContain(s.inst("opponent-betel").instanceId);
    expect(req.options!.visibleCards?.some((card) => card.instanceId === s.inst("opponent-betel").instanceId)).not.toBe(
      true,
    );
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    opponentUnchanged(s, other);
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("opponent-betel").instanceId] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
    const chosen = s.inst("own-1").instanceId;
    answer(s, seat, { kind: "selectCards", instanceIds: [chosen] });
    await settle();
    expect(s.perm("host").topCard.instanceId).toBe(chosen);
    expect(s.perm("host").topCard.ownerSeat).toBe(seat);
    expect(s.perm("host").controllerSeat).toBe(seat);
    expect(s.state.players[seat]!.hand.some((c) => c.instanceId === s.inst("own-0").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    opponentUnchanged(s, other);
  });

  it("automatically resolves a unique legal own destination without taking opposing BetelGammamon", async () => {
    const { s, other } = await fixture(seat, 1);
    const chosen = s.inst("own-0").instanceId;
    await activate(s, seat);
    expect(s.perm("host").topCard.instanceId).toBe(chosen);
    expect(s.perm("host").topCard.ownerSeat).toBe(seat);
    expect(s.state.pendingDecision).toBeUndefined();
    opponentUnchanged(s, other);
  });

  it("does not borrow an opponent destination when own red cards fail requirements", async () => {
    const { s, other } = await fixture(seat, 0);
    await activate(s, seat);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
    opponentUnchanged(s, other);
  });
});
