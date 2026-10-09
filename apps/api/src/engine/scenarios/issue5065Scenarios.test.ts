import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import type { IssueReproScenarioId } from "../issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";

const ATTACK_SOURCES = new Set(["BT4-057", "BT6-025", "BT5-031"]);
const END_OF_TURN_SOURCES = new Set(["BT13-058", "EX9-018"]);

async function start(id: IssueReproScenarioId) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it("#5065 lethal attack: three ordered [When Attacking] effects resolve before the win", async () => {
  const { s, loop } = await start("arena-issue-5065-lethal-attack-order");
  const attacker = s.state.players[0]!.battleArea[0]!;
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settleAcrossTimers(() => s.state.gameOver);
  await loop;

  expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(true);
  const triggered = s.events.flatMap((event, index) =>
    event.kind === "effectTriggered" && ATTACK_SOURCES.has(event.sourceCardId) ? [index] : [],
  );
  const resolved = s.events.flatMap((event, index) =>
    event.kind === "effectResolved" && ATTACK_SOURCES.has(event.sourceCardId) ? [index] : [],
  );
  const gameOver = s.events.findIndex((event) => event.kind === "gameOver");
  expect(triggered).toHaveLength(3);
  expect(resolved).toHaveLength(3);
  expect(Math.max(...resolved)).toBeLessThan(gameOver);
  expect(s.state.winnerSeat).toBe(0);
  expect(s.state.memory).toBe(3 + 3);
});

it("#5065 opponent turn end: the bot's end-of-turn effects resolve before the viewer's draw", async () => {
  const { s, loop } = await start("arena-issue-5065-opponent-turn-end");
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  const viewerHand = s.state.players[0]!.hand.length;
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);

  const endOfTurn = s.events.flatMap((event, index) =>
    event.kind === "effectResolved" && END_OF_TURN_SOURCES.has(event.sourceCardId) ? [index] : [],
  );
  const turnEnded = s.events.findIndex((event) => event.kind === "turnEnded" && event.endingSeat === 1);
  const viewerDrawPhase = s.events.findIndex(
    (event, index) =>
      index > turnEnded && event.kind === "phaseChanged" && event.phase === Phase.Draw && event.turnSeat === 0,
  );
  expect(endOfTurn.length).toBeGreaterThanOrEqual(1);
  expect(Math.max(...endOfTurn)).toBeLessThan(turnEnded);
  expect(viewerDrawPhase).toBeGreaterThan(turnEnded);
  expect(s.state.players[0]!.hand).toHaveLength(viewerHand + 1);
  expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("EX9-018");

  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
