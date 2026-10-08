import { Phase, type DecisionResponse } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each(["accept", "decline activation", "decline evolution"])(
  "Rina modal title arena: %s preserves printed suspend/draw/evolution behavior",
  async (answer) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-ex13-rina-modal-title", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    const board = s.state.players[0]!;
    const veemon = board.battleArea.find((p) => p.topCard.cardId === "BT3-021")!;
    const rina = board.battleArea.find((p) => p.topCard.cardId === "EX13-069")!;
    const respond = (response: DecisionResponse) => {
      expect(
        s.engine.applyIntent(0, { type: "respondDecision", decisionId: s.state.pendingDecision!.decisionId, response }),
      ).toEqual({ ok: true });
    };
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: veemon.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
      expect(veemon.isSuspended).toBe(true);
      const handBefore = board.hand.length;
      const deckBefore = board.deck.length;
      const memoryBefore = s.state.memory;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-rina-title-sword" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.decisions.at(-1)!.req).toMatchObject({
        sourceCardId: "EX13-069",
        promptText:
          "When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞. After, 1 of your Digimon may digivolve into a Digimon card with [Veedramon] in its name in the hand with the cost reduced by 2.",
        options: {
          effectTextPart: "[Your Turn] When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞.",
        },
      });
      respond({ kind: "optional", accept: answer !== "decline activation" });
      if (answer !== "decline activation") {
        await settle(() => s.state.pendingDecision?.kind === "optional");
        respond({ kind: "optional", accept: answer !== "decline evolution" });
      }
      await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
      expect(rina.isSuspended).toBe(answer !== "decline activation");
      expect(veemon.topCard.cardId).toBe(answer === "accept" ? "BT1-115" : "BT3-021");
      expect(veemon.isSuspended).toBe(false);
      expect(board.deck).toHaveLength(deckBefore - (answer === "accept" ? 2 : answer === "decline activation" ? 0 : 1));
      expect(board.hand).toHaveLength(handBefore - (answer === "decline activation" ? 1 : 0));
      expect(s.state.memory).toBe(memoryBefore - 3 - (answer === "accept" ? 1 : 0));
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
