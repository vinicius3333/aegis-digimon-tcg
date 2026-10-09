import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("#5341 playable Yuugo/Omnimon Assembly scenario", () => {
  it("pays four, finishes On Play, then evolves for two and clears the opposing field", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-yuugo-omnimon-assembly", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(4);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: "dev-5341-omnimon",
          assembly: { materialInstanceIds: [0, 1, 2, 3].map((i) => `dev-5341-material-${i}`) },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-016") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(0);
      expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-094")).toHaveLength(
        2,
      );
      expect(s.state.players[0]!.deck.slice(-2).map((c) => c.cardId)).toEqual(["BT22-094", "BT22-094"]);
      const omni = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-016")!;
      expect(omni.stack).toHaveLength(4);
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: omni.permanentId, instanceId: "dev-5341-omnimon-x" }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
      expect(omni.topCard.cardId).toBe("BT20-102");
      expect(s.events.some((e) => e.kind === "memoryChanged" && e.from === 0 && e.to === -2)).toBe(true);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
