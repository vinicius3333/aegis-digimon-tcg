import { Phase, getCardDefinition } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/BT1/BT1-088.js";
import "../cards/BT1/BT1-089.js";
import "../cards/P/P-035.js";
import "../cards/P/P-038.js";
import "../cards/BT25/BT25-075.js";
import "../cards/BT25/BT25-100.js";
import "../cards/BT25/BT25-101.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { checkStateInvariants } from "./testkit/stateInvariants.js";

it("keeps late-game density within a real 50-card deck with distinct instances and legal link capacity", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-field-grouping-dense", s.state, [RED_DECK, BLUE_DECK]);
  await s.ready();
  expect(checkStateInvariants(s.state)).toEqual([]);
  for (const player of s.state.players) {
    const cards = [
      ...player.deck,
      ...player.hand,
      ...player.security,
      ...player.trash,
      ...Array.from(player.battleArea).flatMap((permanent) => [
        permanent.topCard,
        ...permanent.stack,
        ...permanent.linked,
      ]),
    ];
    expect(cards).toHaveLength(50);
    const counts = new Map<string, number>();
    for (const card of cards) {
      expect(getCardDefinition(card.cardId)).toBeDefined();
      counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(4);
    expect(player.battleArea).toHaveLength(21);
    const linked = player.battleArea.find((permanent) => permanent.topCard.cardId === "BT25-075")!;
    expect(linked.stack).toHaveLength(12);
    expect(linked.linked.map((card) => card.cardId)).toEqual(["BT25-101", "BT25-100"]);
    expect(player.battleArea.find((permanent) => permanent.stack.length === 8)?.topCard.cardId).toBe("BT12-098");
  }
});

it("suspends individual repeated Tamers and consumes exactly one Delay Option through real intents", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("field-grouping", s.state, [RED_DECK, BLUE_DECK]);
  await s.ready();
  const human = s.state.players[0]!;
  const izzys = human.battleArea.filter((p) => p.topCard.cardId === "BT1-088");
  expect(izzys).toHaveLength(3);
  const savedTamer = human.battleArea.find((p) => p.topCard.cardId === "BT12-098" && p.stack.length > 0)!;
  expect(savedTamer.stack.map((c) => c.cardId)).toEqual(["BT12-008"]);
  const turn = s.engine.runOneTurn();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  for (const tamer of izzys.slice(0, 2)) {
    const [ability] = JSON.parse(tamer.activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(ability).toBeDefined();
    const handCount = human.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: tamer.topCard.instanceId,
        effectKey: ability!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => tamer.isSuspended && human.hand.length === handCount + 1 && !s.state.pendingDecision);
  }
  expect(izzys.map((p) => p.isSuspended)).toEqual([true, true, false]);
  const boosts = human.battleArea.filter((p) => p.topCard.cardId === "P-035");
  expect(boosts).toHaveLength(2);
  const [delay] = JSON.parse(boosts[0]!.activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(delay).toBeDefined();
  const beforeMemory = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: boosts[0]!.topCard.instanceId,
      effectKey: delay!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => human.trash.some((card) => card.instanceId === boosts[0]!.topCard.instanceId) && !s.state.pendingDecision,
  );
  expect(s.state.memory).toBe(beforeMemory + 2);
  expect(human.battleArea.filter((p) => p.topCard.cardId === "P-035")).toEqual([boosts[1]]);
  expect(savedTamer.stack.map((c) => c.cardId)).toEqual(["BT12-008"]);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
});
