import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT22 Rie Kishibe Discord arena scenario", () => {
  it("pays the By-deletion at end of turn even when no LordKnightmon can be digivolved into", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt22-rie-kishibe-delete-without-digivolve", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    expect(human.security).toHaveLength(5);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT22-090" && req.kind === "optional")).toBe(true);
    expect(human.trash.map(({ instanceId }) => instanceId)).toContain("dev-field-0-rie-ex13");
    expect(human.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT22-090"]);
    expect(human.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(["dev-rie-lordknightmon-x", "dev-rie-lordknightmon-cs"]),
    );

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
