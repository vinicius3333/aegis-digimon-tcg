import { EffectDuration } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each([
  { card: "BT25-028", seat: 1, kind: "restriction", value: "beSuspended" },
  { card: "BT22-052", seat: 0, kind: "keyword", value: "Blocker" },
])("projects $card's field-wide $kind with its public printed source", async ({ card, seat, kind, value }) => {
  const s = setupEngine(
    { 0: { hand: [{ card, as: "source" }] }, 1: {} },
    { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 20;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(JSON.parse(s.state.players[seat]!.fieldEffectsJson)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind,
        value,
        sourceCardId: card,
        ownerSeat: 0,
        duration: EffectDuration.UntilOpponentTurnEnd,
        effectText: expect.any(String),
      }),
    ]),
  );
});
