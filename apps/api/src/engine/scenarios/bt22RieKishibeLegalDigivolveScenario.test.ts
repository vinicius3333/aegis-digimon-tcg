import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("GitHub #5290 Rie Kishibe legal digivolution arena", () => {
  it("deletes the other CS Tamer, digivolves into EX13 LordKnightmon for 2, and completes the turn", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt22-rie-kishibe-legal-digivolve", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    expect(human.security).toHaveLength(3);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const deckBefore = human.deck.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

    const lord = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-rie-legal-base");
    expect(lord?.topCard.cardId).toBe("EX13-064");
    expect(lord?.stack.map(({ cardId }) => cardId)).toEqual(["BT22-090"]);
    expect(human.trash.map(({ instanceId }) => instanceId)).toContain("dev-field-0-rie-legal-payment");
    expect(human.hand.some(({ instanceId }) => instanceId === "dev-rie-legal-lordknightmon")).toBe(false);
    expect(human.deck).toHaveLength(deckBefore - 1);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", reason: "digivolve", from: -3, to: -5 }),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
