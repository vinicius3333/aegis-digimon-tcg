import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT24 Fugamon Discord arena scenario", () => {
  it("does not draw from the Fugamon in hand when another card pays the attack cost (Discord 1555101829619257344)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ["dev-fugamon-fodder"] },
    );
    layDevScenario("arena-bt24-fugamon-self-trash", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const deckSize = human.deck.length;
    const handSize = human.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-fugamon-attacker",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => bot.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(human.trash.map(({ instanceId }) => instanceId)).toContain("dev-fugamon-fodder");
    expect(human.hand.map(({ instanceId }) => instanceId)).toContain("dev-fugamon-in-hand");
    expect(human.hand).toHaveLength(handSize - 1);
    expect(human.deck).toHaveLength(deckSize);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
