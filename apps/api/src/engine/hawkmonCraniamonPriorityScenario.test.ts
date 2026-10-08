import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";

it("#5292: Hawkmon DNA completes before Craniamon selects the new Digimon in the real turn loop", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
  layDevScenario("arena-5292-hawkmon-craniamon-priority", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaChoice = s.decisions.at(-1)!;
    expect(dnaChoice.seat).toBe(0);
    expect(dnaChoice.req.sourceCardId).toBe("P-119");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaChoice.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== dnaChoice.req.decisionId,
    );
    const craniamonChoice = s.decisions.at(-1)!;
    expect(craniamonChoice.seat).toBe(1);
    expect(craniamonChoice.req.sourceCardId).toBe("BT13-077");
    const paildramon = s.state.players[0]!.battleArea[0]!;
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(paildramon.topCard.cardId).toBe("BT12-028");
    expect(paildramon.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["P-119", "BT8-012", "BT1-070"]),
    );
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: craniamonChoice.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toMatchObject([
      { attackerPermanentId: paildramon.permanentId },
    ]);
    expect(paildramon.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(s.state.turnSeat);
    }
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
