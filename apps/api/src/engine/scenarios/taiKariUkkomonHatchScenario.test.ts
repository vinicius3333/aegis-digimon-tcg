import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it.each([false, true])(
  "Discord 1557959345033969705 arena hatches by effect and offers Tai/Kari (promo=%s)",
  async (promo) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario(promo ? "arena-tai-kari-promo-ukkomon-hatch" : "arena-tai-kari-ukkomon-hatch", s.state, [
      BLUE_DECK,
      RED_DECK,
    ]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      const raised = s.state.players[0]!.breeding!;
      expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: raised.permanentId })).toEqual({
        ok: true,
      });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.players[0]!.breeding!.topCard.cardId).toBe("BT1-001");
      expect(s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT17-093")!.isSuspended).toBe(true);
      expect(s.state.memory).toBe(promo ? 5 : 4);
      expect(s.decisions.filter((d) => d.req.sourceCardId === "BT17-093" && d.req.kind === "optional")).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  },
);
