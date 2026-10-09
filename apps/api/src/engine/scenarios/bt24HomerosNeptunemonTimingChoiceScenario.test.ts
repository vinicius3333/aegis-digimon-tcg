import { EffectDuration, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("MiMiMi Homeros / Neptunemon timing choice arena scenario", () => {
  it.each([0, 1])("resolves timing choice %s exactly once through the public turn flow", async (optionIndex) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt24-homeros-neptunemon-timing-choice", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const homeros = human.battleArea.find(({ topCard }) => topCard.cardId === "BT24-102")!;
    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(homeros.isSuspended).toBe(false);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseOption");
      const request = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(request.options?.choiceEffects).toEqual([
        { cardId: "BT24-030", timing: "OnPlay" },
        { cardId: "BT24-030", timing: "WhenDigivolving" },
      ]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "chooseOption", optionIndex },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
      );
      expect(homeros.isSuspended).toBe(true);
      expect(opponent.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(["dev-field-1-timing-more-sources"]);
      expect(opponent.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual([
        "dev-field-1-timing-fewest-a",
        "dev-field-1-timing-fewest-b",
      ]);
      const borrowed = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT24-030",
      );
      expect(borrowed).toHaveLength(1);
      expect(borrowed[0]).toMatchObject({ timing: optionIndex === 0 ? "OnPlay" : "WhenDigivolving" });
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it.each([
    ["whenDigivolving", "OnPlay"],
    ["onPlay", "WhenDigivolving"],
  ] as const)("%s preserves the other timing (Q5721)", async (restriction, expectedTiming) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt24-homeros-neptunemon-timing-choice", s.state, [BLUE_DECK, RED_DECK]);
    const neptunemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT24-030")!;
    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      // No currently printed card isolates both timing locks on this fixture; seed only the restriction.
      advance(s.engine).ledgers.continuous.addEffectTimingDisable(
        neptunemon.permanentId,
        [restriction],
        EffectDuration.Permanent,
      );
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(
        () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
      );
      expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
      expect(s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT24-030")).toEqual(
        [expect.objectContaining({ timing: expectedTiming })],
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
