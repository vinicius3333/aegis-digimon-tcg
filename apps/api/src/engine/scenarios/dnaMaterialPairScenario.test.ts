import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

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

it("#5166 arena: DNA consumes the chosen second pair and preserves the first purple stack", async () => {
  const { s, loop } = await start("arena-issue-5166-dna-material-pairs");
  const [yellow, firstPurple, secondPurple] = s.state.players[0]!.battleArea;
  const mastemon = s.state.players[0]!.hand.find((c) => c.cardId === "ST10-06")!;
  const firstId = firstPurple!.topCard.instanceId;
  const secondId = secondPurple!.topCard.instanceId;
  expect(mastemon.dnaDigivolveRoutes.length).toBeGreaterThan(1);
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      instanceId: mastemon.instanceId,
      materialPermanentIds: [yellow!.permanentId, secondPurple!.permanentId],
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST10-06") &&
      s.state.pendingDecision === undefined,
  );
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === firstId)).toBe(true);
  const evolved = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST10-06")!;
  expect(evolved.stack.some((c) => c.instanceId === secondId)).toBe(true);
  expect(evolved.stack.some((c) => c.instanceId === firstId)).toBe(false);
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
