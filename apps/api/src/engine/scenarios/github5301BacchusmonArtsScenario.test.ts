import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("GitHub #5301 Bacchusmon Option-to-Arts production turn loop", () => {
  it.each([
    { scenario: "arena-github-5301-bacchusmon-arts", accept: true, breeding: false },
    { scenario: "arena-github-5301-bacchusmon-arts", accept: false, breeding: false },
    { scenario: "arena-github-5301-bacchusmon-breeding-arts", accept: true, breeding: true },
    { scenario: "arena-github-5301-bacchusmon-no-arts-base", accept: false, breeding: false },
  ] as const)("$scenario (accept Arts: $accept)", async ({ scenario, accept, breeding }) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario(scenario satisfies DevScenarioId, s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const base = breeding ? human.breeding : human.battleArea.find(({ topCard }) => topCard.cardId === "BT25-055");
    const baseId = base?.topCard.instanceId;
    const low = bot.battleArea.find(({ topCard }) => topCard.cardId === "BT1-009")!;
    const handBefore = human.hand.length;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const handAfterTurnDraw = human.hand.length;
      expect(handAfterTurnDraw).toBe(handBefore + 1);
      expect(s.state.memory).toBe(5);
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-github5301-option", useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const unsuspend = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === unsuspend.decisionId)!.req).toMatchObject({
        sourceCardId: "BT26-080",
        options: { candidateInstanceIds: [low.permanentId], targetFate: "unsuspend", min: 0, max: 1 },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: unsuspend.decisionId,
          response: { kind: "chooseTargets", instanceIds: [low.permanentId] },
        }),
      ).toEqual({ ok: true });

      if (base !== undefined) {
        await settle(() => s.state.pendingDecision?.promptText.includes("Arts Digivolve") === true);
        const arts = s.state.pendingDecision!;
        expect(s.decisions.find(({ req }) => req.decisionId === arts.decisionId)!.req).toMatchObject({
          kind: "selectCards",
          sourceCardId: "BT26-080",
          sourceInstanceId: "dev-github5301-option",
          options: { candidateInstanceIds: [baseId], min: 0, max: 1 },
        });
        expect(bot.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
        expect(s.state.memory).toBe(0);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: arts.decisionId,
            response: { kind: "selectCards", instanceIds: accept ? [baseId!] : [] },
          }),
        ).toEqual({ ok: true });

        if (accept && !breeding) {
          await settle(() => s.state.pendingDecision !== undefined);
          const attack = s.state.pendingDecision!;
          const attackRequest = s.decisions.find(({ req }) => req.decisionId === attack.decisionId)!.req;
          expect(attackRequest.sourceCardId).toBe("BT26-080");
          expect(attackRequest.options?.timing).toBe("WhenDigivolving");
          expect(["optional", "chooseTargets"]).toContain(attackRequest.kind);
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: attack.decisionId,
              response:
                attackRequest.kind === "optional"
                  ? { kind: "optional", accept: false }
                  : { kind: "chooseTargets", instanceIds: [] },
            }),
          ).toEqual({ ok: true });
        }
      }

      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          (accept
            ? base?.topCard.instanceId === "dev-github5301-option"
            : human.trash.some(({ instanceId }) => instanceId === "dev-github5301-option")),
      );
      expect(bot.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-020"]);
      expect(bot.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.memory).toBe(0);
      expect(human.hand).toHaveLength(handAfterTurnDraw - 1 + (accept ? 1 : 0));
      const artsRequests = s.decisions.filter(({ req }) => req.promptText.includes("Arts Digivolve"));
      expect(artsRequests).toHaveLength(base === undefined ? 0 : 1);
      if (accept) {
        expect(base!.topCard.cardId).toBe("BT26-080");
        expect(base!.stack.map(({ cardId }) => cardId)).toContain("BT25-055");
        expect(base!.inBreeding).toBe(breeding);
        expect(human.trash.some(({ instanceId }) => instanceId === "dev-github5301-option")).toBe(false);
        if (breeding) {
          expect(
            s.events.some(
              (event) =>
                event.kind === "effectTriggered" &&
                event.sourceCardId === "BT26-080" &&
                event.timing === "WhenDigivolving",
            ),
          ).toBe(false);
        }
      } else if (base !== undefined) {
        expect(base.topCard.cardId).toBe("BT25-055");
      }
    } finally {
      if (!s.state.gameOver) expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });
});
