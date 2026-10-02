import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX13 Alphamon end-of-turn attack arena scenario", () => {
  it("Discord 1555307552223264829: the end-of-turn attack targets only security, with no hand card lit as playable", async () => {
    // Alphamon's own play triggers its [Your Turn] (KB Q7394). Declining both "may" parts there, as
    // the reporter did, keeps its [Once Per Turn] for the end-of-turn Grademon (KB Q1818).
    const declinePrompts = ["1 of your Digimon may attack", "activate 1 of this Digimon's"];
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts, preferInstanceIds },
    );
    layDevScenario("arena-ex13-alphamon-end-turn-attack", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const securityBefore = bot.security.length;
    const playableHandAtAttackTarget: string[] = [];
    const recordDecision = s.decisions.push.bind(s.decisions);
    s.decisions.push = (...entries) => {
      if (entries.some(({ req }) => req.promptText?.includes("You may play 1 [Chronicle]"))) {
        declinePrompts.length = 0;
      }
      // The Rush Grademon attacks, as in the reported match; Alphamon entered this turn.
      const grademon = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-057");
      if (grademon !== undefined && !preferInstanceIds.includes(grademon.permanentId)) {
        preferInstanceIds.push(grademon.permanentId);
      }
      if (entries.some(({ req }) => req.options?.selectionContext === "attackTarget")) {
        for (const card of human.hand) {
          if (card.playableFromHand || card.digivolveTargetPermanentIds.length > 0) {
            playableHandAtAttackTarget.push(card.cardId);
          }
        }
      }
      return recordDecision(...entries);
    };

    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(10);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-alphamon-rush-alphamon" })).toEqual({
        ok: true,
      });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);

      expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-060", "EX13-057"]);
      const attackTarget = s.decisions.find(({ req }) => req.options?.selectionContext === "attackTarget")?.req;
      expect(attackTarget?.sourceCardId).toBe("EX13-060");
      expect(attackTarget?.options?.candidateInstanceIds).toEqual(["player"]);
      expect(playableHandAtAttackTarget).toEqual([]);
      expect(bot.security).toHaveLength(securityBefore - 1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
