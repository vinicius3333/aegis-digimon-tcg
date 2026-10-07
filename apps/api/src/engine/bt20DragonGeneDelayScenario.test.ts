import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/BT20/BT20-093.js";
import "../cards/BT20/BT20-027.js";
import "../cards/BT4/BT4-102.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT20-093 Unleash the Dragon Gene ＜Delay＞ arena scenario", () => {
  it("offers the Delay with no legal DNA and trashes the Option for no effect (Discord 1557483604253212703)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt20-dragon-gene-delay-no-dna", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const human = s.state.players[0]!;
    const dragonGeneId = human.battleArea.find(({ topCard }) => topCard.cardId === "BT20-093")!.topCard.instanceId;
    const slayerdramonId = human.battleArea.find(({ topCard }) => topCard.cardId === "BT20-027")!.topCard.instanceId;
    const aquaViperId = human.hand.find(({ cardId }) => cardId === "BT4-102")!.instanceId;

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: aquaViperId })).toEqual({ ok: true });
    await settle(
      () => human.hand.some(({ instanceId }) => instanceId === slayerdramonId) && s.state.pendingDecision === undefined,
    );

    expect(human.trash.some(({ instanceId }) => instanceId === dragonGeneId)).toBe(true);
    expect(human.battleArea.some(({ topCard }) => topCard.instanceId === dragonGeneId)).toBe(false);
    expect(
      human.battleArea.some(({ topCard }) => topCard.cardId.startsWith("BT20-") || topCard.cardId === "EX3-074"),
    ).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
