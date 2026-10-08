import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1557789815607533588 arena: only a later Option triggers the new Maid", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
  layDevScenario("arena-sakuyamon-maid-option-timing", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const base = human.battleArea.find((p) => p.topCard.cardId === "BT17-032")!;
    const taomon = human.hand.find((c) => c.cardId === "BT17-035")!;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: taomon.instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
    expect(base.topCard.cardId).toBe("ST22-06");
    expect(human.battleArea.some((p) => p.topCard.cardId === "LM-029")).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.events.filter(
        (e) => e.kind === "effectTriggered" && e.sourceCardId === "ST22-06" && e.printedTiming === "AllTurns",
      ),
    ).toHaveLength(0);
    const later = human.hand.find((c) => c.cardId === "BT1-102")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: later.instanceId })).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security.some((c) => c.cardId === "BT1-010")).toBe(true);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
