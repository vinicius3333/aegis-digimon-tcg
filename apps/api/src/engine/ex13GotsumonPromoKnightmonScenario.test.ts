import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX13 Gotsumon promo Knightmon arena scenario", () => {
  it("Discord 1555252641649393796 adds P-111 Knightmon as the Blocker card", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderCards: true });
    layDevScenario("arena-ex13-gotsumon-promo-knightmon", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const player = s.state.players[0]!;
    expect(player.deck.slice(0, 3).map(({ cardId }) => cardId)).toEqual(["ST15-14", "P-111", "LM-031"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-ex13-gotsumon-knightmon" })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some(({ instanceId }) => instanceId === "dev-gotsumon-promo-knightmon") &&
        s.state.pendingDecision === undefined,
    );

    expect(player.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual([
      "dev-gotsumon-tai-kamiya",
      "dev-gotsumon-black-scramble",
    ]);
    expect(player.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-047"]);
  });
});
