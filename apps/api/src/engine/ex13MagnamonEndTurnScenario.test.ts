import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/EX13/EX13-020.js";
import "../cards/BT4/BT4-070.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX13 Magnamon end-of-turn arena scenario", () => {
  it.each([true, false])(
    "resolves Magnamon before changing turns (accept=%s), then Reboot in Active",
    async (accept) => {
      const unsuspends: { id: string; seat: number; phase: string }[] = [];
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoSelectCards: true,
          onEvent(event) {
            if (event.kind === "cardsMoved" && event.from === "suspended" && event.to === "unsuspended") {
              for (const id of event.instanceIds) unsuspends.push({ id, seat: s.state.turnSeat, phase: s.state.phase });
            }
          },
        },
      );
      layDevScenario("arena-ex13-magnamon-end-turn", s.state, [BLUE_DECK, RED_DECK]);
      await s.ready();
      const [magnamon, reboot] = s.state.players[0]!.battleArea;
      expect(magnamon!.topCard.cardId).toBe("EX13-020");
      expect(magnamon!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-021"]);
      expect(reboot!.keywords).toContain("Reboot");
      expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(Array(5).fill("BT1-029"));

      const ownTurn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      // Arrange the post-attack board after the owner's normal Active phase.
      magnamon!.isSuspended = true;
      reboot!.isSuspended = true;
      advance(s.engine).endMainPhaseIfOpen(0);
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.state.turnSeat).toBe(0);
      expect(reboot!.isSuspended).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await ownTurn;
      expect(magnamon!.isSuspended).toBe(!accept);
      expect(reboot!.isSuspended).toBe(true);
      expect(unsuspends.filter(({ id }) => id === magnamon!.permanentId)).toEqual(
        accept ? [{ id: magnamon!.permanentId, seat: 0, phase: Phase.Main }] : [],
      );

      s.state.turnSeat = 1;
      s.state.memory = 3;
      const opponentTurn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(reboot!.isSuspended).toBe(false);
      expect(magnamon!.isSuspended).toBe(!accept);
      expect(unsuspends).toContainEqual({ id: reboot!.permanentId, seat: 1, phase: Phase.Active });
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
    },
  );
});
