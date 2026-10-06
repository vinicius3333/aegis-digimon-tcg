import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("#5015 arena keeps seven links after PAD, the forced attack, and the turn change", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferTriggerKeys: ["BT26-086"],
    },
  );
  layDevScenario("arena-issue-5015-dantemon-attack-links", s.state, [BLUE_DECK, RED_DECK]);
  const topSecurityId = s.state.players[1]!.security[0]!.instanceId;
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const pad = s.state.players[0]!.hand.find(({ cardId }) => cardId === "BT26-102")!;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: pad.instanceId })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  const dantemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-086")!;
  expect(dantemon).toBeDefined();
  expect(dantemon.linked.map(({ cardId }) => cardId).sort()).toEqual([
    "BT26-010",
    "BT26-019",
    "BT26-028",
    "BT26-037",
    "BT26-051",
    "BT26-063",
    "BT26-084",
  ]);
  expect(observe(s.engine).linkMaxDelta(dantemon)).toBe(6);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.decisions.some(({ req }) => req.promptText.includes("link cards to trash"))).toBe(false);
  expect(s.events.filter(({ kind }) => kind === "attackEnded")).toHaveLength(1);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(topSecurityId);
  expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["P-108", "BT7-107"]);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
