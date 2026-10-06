import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function start(id: DevScenarioId) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true });
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const skipped = s.state.phase === Phase.Breeding ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
  expect(skipped).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it.each([
  ["arena-issue-5173-cyber-engage", 0],
  ["arena-issue-5173-cyber-engage-psychemon", -3],
] as const)("#5173 arena: %s charges the rules-correct Roleplaymon cost", async (id, expectedMemory) => {
  const { s, loop } = await start(id);
  const delay = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT25-098")!;
  const entry = JSON.parse(delay.activatableEffectsJson)[0] as { effectKey: string };
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: delay.topCard.instanceId,
      effectKey: entry.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT26-010") &&
      s.state.pendingDecision === undefined,
  );
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
  expect(
    s.events.some(
      (e) => e.kind === "memoryChanged" && e.reason === "playCard" && e.from === 1 && e.to === expectedMemory,
    ),
  ).toBe(true);
  let skipped: ReturnType<typeof s.engine.applyIntent> = { ok: true };
  if (expectedMemory < 0) {
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    skipped = s.engine.applyIntent(1, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(1);
  }
  expect(skipped).toEqual({ ok: true });
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
