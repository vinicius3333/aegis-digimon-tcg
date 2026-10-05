import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("Discord 1556321937188196474 Koromon arena scenario", () => {
  it("draws before revealing Gaogamon, and only once per turn", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt5-koromon-attack-draw", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const handBefore = human.hand.length;
    const eventsBefore = s.events.length;
    const attacker = human.battleArea[0]!;
    expect(attacker.stack.map(({ cardId }) => cardId)).toEqual(["BT5-001", "BT12-059", "BT9-008"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => bot.security.length === 4 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    const events = s.events.slice(eventsBefore);
    const draw = events.findIndex(
      (event) => event.kind === "cardsMoved" && event.from === "deck" && event.to === "hand",
    );
    const reveal = events.findIndex((event) => event.kind === "securityRevealed" && event.revealedCardId === "EX4-017");
    expect(draw).toBeGreaterThanOrEqual(0);
    expect(reveal).toBeGreaterThan(draw);
    expect(human.hand.length).toBe(handBefore + 1);
    expect(events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT5-001")).toHaveLength(
      1,
    );

    await advance(s.engine).verb.unsuspend([attacker.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => bot.security.length === 3 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    expect(human.hand.length).toBe(handBefore + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
