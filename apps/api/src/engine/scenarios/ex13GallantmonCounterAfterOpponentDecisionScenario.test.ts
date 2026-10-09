import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("EX13 Gallantmon Counter after the attacker's decision arena scenario", () => {
  it("Discord 1558162472945586388 opens the defender's Counter right after the attacker answers its prompt", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-ex13-gallantmon-counter-after-opponent-decision", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const mervamon = "dev-perm-1-counter-mervamon";
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: mervamon, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "optional");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow !== undefined);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.combatWindow).toMatchObject({ kind: "counter", seat: 0, attackerPermanentId: mervamon });
    expect(s.engine.inputSeat).toBe(0);
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    expect(opened).toMatchObject({ defendingSeat: 0 });
    expect(
      opened?.kind === "counterWindowOpened" ? opened.eligibleCounters.map(({ effectKey }) => effectKey) : [],
    ).toContain("EX13-015/ir-shared-0");
  });
});
