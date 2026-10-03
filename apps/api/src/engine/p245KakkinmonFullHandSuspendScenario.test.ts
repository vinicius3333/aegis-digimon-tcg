import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("P-245 Kakkinmon full hand Discord arena scenario", () => {
  it("suspends Craniamon with 8 cards in hand, skips the draw, and fires the sweep (Discord 1555485421750984765)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-p245-kakkinmon-full-hand-suspend", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const craniamon = human.battleArea.find(({ topCard }) => topCard.instanceId === "dev-field-0-kakkinmon-craniamon")!;
    const botTopCards = () => bot.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(human.hand).toHaveLength(8);
    const deckBeforeEnd = human.deck.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );

    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" && event.to === "suspended" && event.instanceIds.includes(craniamon.permanentId),
      ),
    ).toBe(true);
    expect(craniamon.isSuspended).toBe(false);
    expect(botTopCards()).toEqual(["dev-field-1-kakkinmon-dearer"]);
    expect(human.hand).toHaveLength(8);
    expect(human.deck).toHaveLength(deckBeforeEnd);
    expect(
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245" && event.seat === 0),
    ).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
