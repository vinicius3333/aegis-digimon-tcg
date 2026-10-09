import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";

it.each([true, false])("#5361 playable arena: stack Guilmon recovery accept=%s", async (accept) => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
  );
  layDevScenario("arena-growlmon-deletion-5361", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const base = human.battleArea.find(({ topCard }) => topCard.cardId === "BT2-013")!;
    const guilmon = base.stack.find(({ cardId }) => cardId === "EX8-009")!;
    const xGrowlmon = human.hand.find(({ cardId }) => cardId === "EX8-012")!;
    expect(human.trash).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: xGrowlmon.instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => human.trash.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(human.trash.some(({ instanceId }) => instanceId === guilmon.instanceId)).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: base.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.events.some(({ kind }) => kind === "attackEnded") && s.state.pendingDecision === undefined,
    );
    expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(accept ? [guilmon.instanceId] : []);
    expect(human.trash.some(({ instanceId }) => instanceId === guilmon.instanceId)).toBe(!accept);
    expect(human.trash.some(({ instanceId }) => instanceId === xGrowlmon.instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(1);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
