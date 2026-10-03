import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("deletes the Ravemon that plays itself from security after Susanoomon's turn DP reduction", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoDeclineOptional: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-ex12-susanoomon-later-arrival-dp");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const base = human.battleArea.find(({ topCard }) => topCard.cardId === "EX12-019")!;
    const susanoomon = human.hand.find(({ cardId }) => cardId === "EX12-076")!;
    const ravemonId = bot.security[0]!.instanceId;
    expect(bot.security[0]).toMatchObject({ cardId: "BT26-082", faceUp: true });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: susanoomon.instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard.cardId === "EX12-076" && s.state.pendingDecision === undefined);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT26-082") &&
        s.state.pendingDecision === undefined,
    );

    expect(bot.security.some(({ instanceId }) => instanceId === ravemonId)).toBe(false);
    expect(bot.battleArea.some(({ topCard }) => topCard.instanceId === ravemonId)).toBe(false);
    expect(bot.trash.map(({ instanceId }) => instanceId)).toContain(ravemonId);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
