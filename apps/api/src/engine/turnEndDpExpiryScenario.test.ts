import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";

it("Discord 1557702941106901032 mechanism: public intents expire DP before the next Active memory setter", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
  layDevScenario("arena-turn-end-dp-expiry", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const host = s.state.players[0]!.battleArea[0]!;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: host.permanentId,
      instanceId: "dev-dp-expiry-war",
    }),
  ).toEqual({ ok: true });
  await settle(() => host.currentDP === 11000 && s.state.pendingDecision === undefined);
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.memory).toBe(1);
  const start = s.events.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-dp-expiry-training" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(host.currentDP).toBe(8000);
  expect(s.state.memory).toBe(3);
  expect(s.state.pendingDecision).toBeUndefined();
  const handoff = s.events.slice(start).flatMap((event) => {
    if (event.kind === "turnEnded") return ["end"];
    if (event.kind === "phaseChanged") return [event.phase];
    if (event.kind === "effectTriggered" && event.sourceCardId === "BT3-093") return ["setter"];
    return [];
  });
  expect(handoff).toEqual(["end", Phase.Active, "setter", Phase.Draw, Phase.Breeding]);
  assertNoLoudGap(s);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
