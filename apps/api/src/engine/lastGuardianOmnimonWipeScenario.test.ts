import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("offers only the earlier Last Guardian's Delay against Omnimon (X Antibody)'s wipe (Discord 1555673696960774224)", async () => {
  const preferInstanceIds = ["dev-field-0-last-guardian-survivor", "dev-field-1-last-guardian-target"];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
  );
  layDevScenario("arena-bt20-last-guardian-omnimon-wipe", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = 6;
  const human = s.state.players[0]!;
  const bot = s.state.players[1]!;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-last-guardian-fresh" })).toEqual({ ok: true });
  await settle(
    () =>
      human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-last-guardian-fresh") &&
      s.state.pendingDecision === undefined,
  );
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: "dev-perm-0-last-guardian-omnimon",
      instanceId: "dev-last-guardian-omnimon-x",
    }),
  ).toEqual({ ok: true });
  await settle(() => bot.battleArea.length === 0 && s.state.pendingDecision === undefined);

  const delayPrompts = s.decisions.filter(
    ({ req }) => req.kind === "optional" && req.promptText === "Prevent leaving the battle area?",
  );
  expect(delayPrompts.map(({ req }) => req.sourcePermanentId)).toEqual(["dev-perm-0-last-guardian-established"]);
  expect(human.trash.some(({ instanceId }) => instanceId === "dev-field-0-last-guardian-established")).toBe(true);
  expect(human.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
    ["dev-field-0-last-guardian-survivor", "dev-last-guardian-fresh", "dev-last-guardian-omnimon-x"].sort(),
  );
  expect(bot.deck.at(-1)?.instanceId).toBe("dev-field-1-last-guardian-target");
  expect(bot.trash.map(({ instanceId }) => instanceId)).toEqual(["dev-field-1-last-guardian-wiped"]);

  advance(s.engine).endMainPhaseIfOpen(0);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
