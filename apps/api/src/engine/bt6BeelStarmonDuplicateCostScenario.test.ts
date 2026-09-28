import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("stages the logged BeelStarmon hand and charges five despite the second copy", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-bt6-beelstarmon-duplicate-cost");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.state.memory).toBe(6);
    const human = s.state.players[0]!;
    expect(human.hand.filter(({ cardId }) => cardId === "BT6-112")).toHaveLength(2);
    expect(human.trash.map(({ cardId }) => cardId)).toEqual([
      "BT6-112",
      "BT6-095",
      "ST14-12",
      "ST14-12",
      "BT9-097",
      "BT9-097",
      "BT9-097",
    ]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const played = human.hand.find(({ cardId }) => cardId === "BT6-112")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: played.instanceId })).toEqual({ ok: true });
    await settle(() => human.battleArea.some(({ topCard }) => topCard.instanceId === played.instanceId));

    expect(s.state.memory).toBe(1);
    expect(human.hand.filter(({ cardId }) => cardId === "BT6-112")).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
