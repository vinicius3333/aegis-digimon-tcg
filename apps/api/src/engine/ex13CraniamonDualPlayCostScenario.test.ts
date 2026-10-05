import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX13 Craniamon DUAL play-cost arena", () => {
  it("deletes only BetelGammamon and never invokes Siriusmon's leave replacements (Discord 1556424046827282472)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-craniamon-dual-play-cost", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const siriusmon = bot.battleArea.find(({ topCard }) => topCard.cardId === "EX12-018")!;
    const sources = siriusmon.stack.map(({ instanceId }) => instanceId);
    const deckBefore = human.deck.length;
    expect(human.hand).toHaveLength(8);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );

    expect(bot.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX12-018", "P-240"]);
    expect(siriusmon.stack.map(({ instanceId }) => instanceId)).toEqual(sources);
    expect(bot.trash.map(({ cardId }) => cardId)).toEqual(["EX12-013"]);
    expect(human.hand).toHaveLength(8);
    expect(human.deck).toHaveLength(deckBefore);
    expect(human.battleArea[0]!.isSuspended).toBe(false);
    expect(
      s.events.some(
        (event) => event.kind === "effectTriggered" && ["EX12-014", "BT21-022"].includes(event.sourceCardId),
      ),
    ).toBe(false);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
