import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const cases = [
  { id: "arena-issue-5142-bt10-087-search", cardId: "BT10-087", expectedHand: ["AD1-006"], revealCount: 4 },
  { id: "arena-issue-5155-bt12-021-search", cardId: "BT12-021", expectedHand: ["AD1-011", "BT12-090"], revealCount: 3 },
  { id: "arena-issue-5117-bt13-048-search", cardId: "BT13-048", expectedHand: ["AD1-010", "AD1-008"], revealCount: 3 },
  { id: "arena-issue-5148-bt24-043-search", cardId: "BT24-043", expectedHand: ["AD1-010", "BT24-009"], revealCount: 3 },
  { id: "arena-issue-5132-bt24-044-search", cardId: "BT24-044", expectedHand: ["BT20-085", "BT1-012"], revealCount: 3 },
  { id: "arena-issue-5121-bt24-058-search", cardId: "BT24-058", expectedHand: ["AD1-003"], revealCount: 3 },
  {
    id: "arena-issue-5138-bt25-022-search",
    cardId: "BT25-022",
    expectedHand: ["BT24-011", "BT24-009"],
    revealCount: 3,
  },
  { id: "arena-issue-5131-bt3-093-search", cardId: "BT3-093", expectedHand: ["AD1-006", "AD1-011"], revealCount: 3 },
  { id: "arena-issue-5108-ex12-073-search", cardId: "EX12-073", expectedHand: ["BT18-041"], revealCount: 3 },
  { id: "arena-issue-5137-ex13-027-search", cardId: "EX13-027", expectedHand: ["BT11-040"], revealCount: 3 },
  { id: "arena-issue-5107-ex2-008-search", cardId: "EX2-008", expectedHand: ["AD1-003", "BT12-089"], revealCount: 4 },
  { id: "arena-issue-5109-ex4-038-search", cardId: "EX4-038", expectedHand: ["AD1-001", "AD1-010"], revealCount: 3 },
  { id: "arena-issue-5135-st14-11-search", cardId: "ST14-11", expectedHand: ["AD1-002"], revealCount: 4 },
  { id: "arena-issue-5132-st18-04-search", cardId: "ST18-04", expectedHand: ["BT1-012", "BT18-060"], revealCount: 3 },
  { id: "arena-issue-5114-st20-02-search", cardId: "ST20-02", expectedHand: ["AD1-001", "AD1-019"], revealCount: 3 },
  { id: "arena-issue-5152-lm-051-search", cardId: "LM-051", expectedHand: ["AD1-001"], revealCount: 3 },
  { id: "arena-issue-5132-lm-055-search", cardId: "LM-055", expectedHand: ["AD1-001"], revealCount: 2 },
] as const;

it.each(cases)("$id exposes printed reveal choices and completes in the public turn loop", async (fixture) => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  layDevScenario(fixture.id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const card = s.state.players[0]!.hand.find((c) => c.cardId === fixture.cardId)!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === fixture.cardId) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining([...fixture.expectedHand]));
    const selections = s.decisions.filter(
      ({ req }) => req.kind === "selectCards" && req.sourceCardId === fixture.cardId,
    );
    expect(selections.length).toBeGreaterThan(0);
    for (const { req } of selections) {
      expect(req.options?.visibleCards).toHaveLength(fixture.revealCount);
      expect(req.options?.candidateInstanceIds?.length).toBeGreaterThan(0);
    }
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
