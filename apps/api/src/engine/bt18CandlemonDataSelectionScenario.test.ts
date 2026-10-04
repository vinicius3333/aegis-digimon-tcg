import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const DYNASMON = "dev-candlemon-dynasmon";
const WIZARDMON = "dev-candlemon-wizardmon";
const CANDLEMON = "dev-candlemon-revealed";

describe("BT18 Candlemon arena (Discord 1556041043550408755)", () => {
  it.each(["dynasmon", "wizardmon"] as const)("replays Nom's reveal with %s as the yellow Data pick", async (pick) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoOrderCards: false });
    layDevScenario("arena-bt18-candlemon-data-selection", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const player = s.state.players[0]!;
      const deckBefore = player.deck.map(({ instanceId }) => instanceId);
      const memoryBefore = s.state.memory;
      expect(deckBefore.slice(0, 3)).toEqual([DYNASMON, CANDLEMON, WIZARDMON]);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-candlemon-play" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined);
      const selection = s.decisions.at(-1)!.req;
      expect(selection.kind).toBe("selectCards");
      expect(selection.options?.candidateInstanceIds).toEqual([DYNASMON, CANDLEMON, WIZARDMON]);
      expect(selection.options?.effectTextPart).toBe("Add 1 yellow card with the [Data] trait");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [pick === "dynasmon" ? DYNASMON : WIZARDMON] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== selection.decisionId);
      const next = s.decisions.at(-1)!.req;
      expect(next.kind).toBe(pick === "dynasmon" ? "selectCards" : "orderCards");
      expect(next.options?.candidateInstanceIds).toEqual(pick === "dynasmon" ? [WIZARDMON] : [DYNASMON, CANDLEMON]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: next.decisionId,
          response:
            pick === "dynasmon"
              ? { kind: "selectCards", instanceIds: [WIZARDMON] }
              : { kind: "orderCards", order: [CANDLEMON, DYNASMON] },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.pendingDecision === undefined && player.hand.some(({ instanceId }) => instanceId === WIZARDMON),
      );
      expect(player.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
        (pick === "dynasmon" ? ["dev-candlemon-draw", DYNASMON, WIZARDMON] : ["dev-candlemon-draw", WIZARDMON]).sort(),
      );
      expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
        ...deckBefore.slice(3),
        CANDLEMON,
        ...(pick === "wizardmon" ? [DYNASMON] : []),
      ]);
      expect(player.battleArea.map(({ topCard }) => topCard.instanceId)).toContain("dev-candlemon-play");
      expect(s.state.memory).toBe(memoryBefore - 3);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
