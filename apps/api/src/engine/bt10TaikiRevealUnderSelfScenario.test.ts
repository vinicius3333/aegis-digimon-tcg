import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1556107827456774256: arena places ShootingStarmon only under the newly played Taiki", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      preferInstanceIds: ["dev-taiki-reveal-deck-3", "dev-taiki-reveal-deck-4"],
    },
  );
  layDevScenario("arena-bt10-taiki-reveal-under-self", s.state, [BLUE_DECK, RED_DECK]);
  const olderTamers = [...s.state.players[0]!.battleArea];
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-taiki-reveal-played" })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-087") &&
        s.state.pendingDecision === undefined,
    );

    const taiki = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === "dev-taiki-reveal-played",
    )!;
    expect(taiki.stack.map((card) => card.instanceId)).toEqual(["dev-taiki-reveal-deck-4"]);
    expect(olderTamers).toHaveLength(3);
    expect(olderTamers.every((permanent) => permanent.stack.length === 0)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === "dev-taiki-reveal-deck-3")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT21-021", "BT21-083"]);
    expect(s.decisions.some(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT10-087")).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
