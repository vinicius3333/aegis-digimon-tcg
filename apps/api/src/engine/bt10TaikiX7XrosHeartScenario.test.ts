import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1555932180322975924: arena places the lone X7 under Taiki after adding Kotone", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      preferInstanceIds: ["dev-x7-deck-2"],
    },
  );
  layDevScenario("arena-bt10-taiki-x7-xros-heart", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-x7-taiki" })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-087") &&
        s.state.pendingDecision === undefined,
    );
    const taiki = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === "dev-x7-taiki")!;
    expect(taiki.stack.map((c) => c.cardId)).toEqual(["AD1-006"]);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === "dev-x7-deck-2")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((c) => c.cardId)).toEqual(["BT21-083", "BT8-097"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
