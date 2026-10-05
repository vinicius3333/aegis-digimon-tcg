import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("Discord bug 1556518401655054436: Homeros does not trigger native or Succession Ceresmon in the arena", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
  layDevScenario("arena-bt25-ceresmon-homeros-suspend", s.state, [BLUE_DECK, RED_DECK]);
  const human = s.state.players[0]!;
  const opponent = s.state.players[1]!;
  const homeros = human.battleArea.find((p) => p.topCard.cardId === "BT24-102")!;
  const attacker = human.battleArea.find((p) => p.topCard.cardId === "BT1-013")!;
  const target = opponent.battleArea[0]!;
  const ceresmonTriggers = () =>
    s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-059");
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(homeros.isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(human.hand).toHaveLength(2);
    expect(ceresmonTriggers()).toHaveLength(0);
    expect(target.currentDP).toBe(17000);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(ceresmonTriggers()).toHaveLength(2);
    expect(ceresmonTriggers()).toContainEqual(expect.objectContaining({ isInherited: true }));
    expect(target.currentDP).toBe(5000);
    expect(opponent.security).toHaveLength(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
