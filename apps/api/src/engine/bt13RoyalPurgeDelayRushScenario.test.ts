import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("offers the attack for the Omnimon played by Royal Knights of the Purge's Delay (Discord 1554301049614110770)", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("arena-bt13-royal-purge-delay-rush", s.state, [BLUE_DECK, RED_DECK]);
  await s.ready();
  const human = s.state.players[0]!;
  const purge = human.battleArea.find(({ topCard }) => topCard.cardId === "BT13-110")!;
  const purgeId = purge.topCard.instanceId;

  const turn = s.engine.runOneTurn();
  // King Drasil_7D6 cannot leave the breeding area, so the Breeding phase has no action and
  // advances on its own into Main, where its Start of Main effect resolves first.
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined);

  const delay = (
    JSON.parse(purge.activatableEffectsJson || "[]") as { effectKey: string; description?: string }[]
  ).find(({ description }) => description?.includes("Delay"));
  expect(delay).toBeDefined();
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: purgeId, effectKey: delay!.effectKey }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "effectActivated" && event.sourceCardId === "BT13-110"));

  const omnimon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT20-102")!;
  expect(human.trash.some(({ instanceId }) => instanceId === purgeId)).toBe(true);
  expect(s.decisions.some(({ req }) => req.promptText === "reduce the play cost by 4")).toBe(true);
  expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-102")).toBe(false);
  expect(
    human.battleArea.filter(({ topCard }) => topCard.cardId === "BT20-091").every((tamer) => tamer.isSuspended),
  ).toBe(true);
  expect([...omnimon.keywords]).toContain("Rush");
  expect(omnimon.summoningSick).toBe(false);
  expect(omnimon.canAttackPlayer).toBe(true);
  expect([...omnimon.attackablePermanentIds]).toHaveLength(0);

  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
});
