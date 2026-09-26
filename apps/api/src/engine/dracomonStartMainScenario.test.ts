import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

describe("Dracomon simultaneous start-main arena scenario", () => {
  it.each(["BT20-007", "BT21-046"])("moves from breeding and resolves %s first", async (firstCard) => {
    const s = setupEngine(
      { 0: {} },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoOrderTriggers: false,
        preferInstanceIds: ["dev-dracomon-turn-draw"],
      },
    );
    layDevScenario("arena-bt21-dracomon-start-main", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const human = s.state.players[0]!;
    const dracomonX = human.breeding!;
    expect(dracomonX.topCard.cardId).toBe("BT21-046");
    expect(human.hand.map(({ cardId }) => cardId)).not.toContain("EX3-018");
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(human.hand.map(({ cardId }) => cardId)).toContain("EX13-008");
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: dracomonX.permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("orderTriggers");
    const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
    const options = request?.options;
    if (!pending || !options?.triggerCardIds || !options.triggerKeys) throw new Error("Missing effect order choice");
    expect(options.triggerCardIds).toEqual(expect.arrayContaining(["BT20-007", "BT21-046"]));
    expect(human.hand.map(({ cardId }) => cardId)).not.toContain("EX3-018");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [options.triggerKeys[options.triggerCardIds.indexOf(firstCard)]!] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(dracomonX.topCard.cardId).toBe(firstCard === "BT20-007" ? "EX3-018" : "BT21-046");
    expect(human.hand.some(({ cardId }) => cardId === "EX3-018")).toBe(firstCard === "BT21-046");
    expect(human.trash.some(({ cardId }) => cardId === "EX13-008")).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
