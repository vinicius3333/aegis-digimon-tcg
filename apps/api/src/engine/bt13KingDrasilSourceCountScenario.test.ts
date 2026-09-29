import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("stages King Drasil and charges Jesmon for every source added after Omekamon's play", async () => {
  const preferInstanceIds = ["dev-king-drasil-kentaurosmon"];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, declineDigiXros: true, preferInstanceIds },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-bt13-king-drasil-source-count");
  try {
    // A breeding area holding only a Digi-Egg has no breeding action, so the turn opens Main.
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const drasil = human.breeding!;
    expect(drasil.topCard.cardId).toBe("BT13-007");
    expect(drasil.stack.map(({ instanceId }) => instanceId)).toEqual([
      "dev-king-drasil-egg",
      "dev-stack-0-king-drasil-0",
      "dev-stack-0-king-drasil-1",
    ]);
    expect(s.state.memory).toBe(10);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-king-drasil-omekamon" })).toEqual({ ok: true });
    await settle(() => drasil.stack.some(({ instanceId }) => instanceId === "dev-king-drasil-kentaurosmon"));
    await settle();
    expect(drasil.stack).toHaveLength(4);
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-king-drasil-jesmon" })).toEqual({ ok: true });
    await settle(() => human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-king-drasil-jesmon"));
    expect(s.state.memory).toBe(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
