/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

describe("BT18 Lucemon optional hand cost arena", () => {
  it.each(["decline cost", "opponent declines", "opponent accepts"])(
    "GitHub #5312 Start of Main and On Play: %s",
    async (branch) => {
      const s = setupEngine({ 0: {}, 1: {} });
      layDevScenario("arena-bt18-lucemon-optional-hand-cost", s.state, [BLUE_DECK, RED_DECK]);
      s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      expect(human.hand.some(({ instanceId }) => instanceId === "dev-lucemon-turn-draw")).toBe(true);
      for (const [index, costId] of ["dev-lucemon-hand-cost", "dev-lucemon-other-cost"].entries()) {
        if (index === 1) {
          expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-lucemon-onplay" })).toEqual({ ok: true });
        }
        await settle(() => s.state.pendingDecision?.kind === "selectCards");
        const own = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!;
        expect(own.seat).toBe(0);
        expect(own.req.options?.min).toBe(0);
        expect(own.req.options?.max).toBe(1);
        const beforeHumanSecurity = human.security.map(({ instanceId }) => instanceId);
        const beforeOpponentSecurity = opponent.security.map(({ instanceId }) => instanceId);
        const recoveryId = human.deck[0]!.instanceId;
        const beforeTrash = human.trash.length;
        const beforeDecisions = s.decisions.length;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: own.req.decisionId,
            response: { kind: "selectCards", instanceIds: branch === "decline cost" ? [] : [costId] },
          }),
        ).toEqual({ ok: true });
        if (branch !== "decline cost") {
          await settle(() => s.state.pendingDecision?.kind === "optional");
          const choice = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!;
          expect(choice.seat).toBe(1);
          expect(human.trash.map(({ instanceId }) => instanceId)).toContain(costId);
          expect(
            s.engine.applyIntent(1, {
              type: "respondDecision",
              decisionId: choice.req.decisionId,
              response: { kind: "optional", accept: branch === "opponent accepts" },
            }),
          ).toEqual({ ok: true });
        }
        await settle(() => s.state.pendingDecision === undefined);
        if (branch === "decline cost") {
          expect(human.hand.map(({ instanceId }) => instanceId)).toContain(costId);
          expect(human.trash).toHaveLength(beforeTrash);
          expect(s.decisions.slice(beforeDecisions).some(({ seat }) => seat === 1)).toBe(false);
          expect(human.security.map(({ instanceId }) => instanceId)).toEqual(beforeHumanSecurity);
          expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(beforeOpponentSecurity);
        } else if (branch === "opponent declines") {
          expect(human.security.map(({ instanceId }) => instanceId)).toEqual([recoveryId, ...beforeHumanSecurity]);
          expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(beforeOpponentSecurity);
        } else {
          expect(human.security.map(({ instanceId }) => instanceId)).toEqual(beforeHumanSecurity);
          expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(beforeOpponentSecurity.slice(1));
          expect(opponent.trash.map(({ instanceId }) => instanceId)).toContain(beforeOpponentSecurity[0]);
          expect(human.deck[0]!.instanceId).toBe(recoveryId);
        }
      }
      expect(human.battleArea.filter(({ topCard }) => topCard?.cardId === "BT18-034")).toHaveLength(2);
      expect(s.state.memory).toBe(0);
      assertNoLoudGap(s);
    },
  );
});
