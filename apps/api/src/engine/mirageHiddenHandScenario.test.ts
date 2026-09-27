import { Phase, type DecisionResponse, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("runs the Mirage arena attack through blind selection, private inspection and blind ordering", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoOrderCards: false });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-mirage-hidden-hand");
  async function answer(seat: Seat, response: DecisionResponse) {
    const req = s.decisions.at(-1)!.req;
    expect(req.seat).toBe(seat);
    expect(s.engine.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response })).toEqual({
      ok: true,
    });
    await settle();
  }
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const mirage = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: mirage.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options).toMatchObject({ visibleInstanceIds: [], visibleCards: [], min: 6, max: 6 });
    expect(request.options?.candidateInstanceIds).toHaveLength(14);
    const chosen = request.options!.candidateInstanceIds!.slice(0, 6);
    await answer(0, { kind: "selectCards", instanceIds: chosen });
    const inspection = s.decisions.at(-1)!.req;
    expect(inspection.options?.visibleCards).toHaveLength(6);
    await answer(1, { kind: "selectCards", instanceIds: [] });
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ candidateInstanceIds: chosen, visibleInstanceIds: [] });
    expect(s.decisions.at(-1)!.req.options?.visibleCards ?? []).toEqual([]);
    const order = [...chosen].reverse();
    await answer(0, { kind: "orderCards", order });
    await settle(() => s.events.some((e) => e.kind === "securityChecked"));
    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.deck.slice(-6).map((c) => c.instanceId)).toEqual(order);
    expect(mirage.isSuspended).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
