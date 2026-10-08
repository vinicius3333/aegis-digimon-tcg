import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1557624042733969509 MetalGreymon arena turn loop", () => {
  it.each([2, 4] as const)(
    "%i colors: one choice per activation, legal second activation, exact costs",
    async (colors) => {
      const preferred: string[] = [];
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
      );
      layDevScenario(
        colors === 4
          ? "arena-bt21-metalgreymon-one-target-four-colors"
          : "arena-bt21-metalgreymon-one-target-two-colors",
        s.state,
        [BLUE_DECK, RED_DECK],
      );
      await s.ready();
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const base = human.battleArea.find((p) => p.topCard.cardId === "BT21-057")!;
      const first = opponent.battleArea[0]!;
      const second = opponent.battleArea[1]!;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(10);
        preferred.push(first.permanentId);
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-metalgreymon-play" })).toEqual({
          ok: true,
        });
        await settle(
          () => first.topCard.cardId === (colors === 4 ? "BT21-042" : "BT21-044") && !s.state.pendingDecision,
        );
        expect(s.state.memory).toBe(3);
        expect(second.topCard.cardId).toBe("BT21-045");
        expect(second.stack).toHaveLength(2);
        expect(
          s.decisions.filter(
            ({ req }) =>
              req.kind === "chooseTargets" &&
              req.sourceCardId === "BT21-061" &&
              (req.options?.timing === "OnPlay" || req.options?.timing === "WhenDigivolving"),
          ),
        ).toHaveLength(1);
        preferred.splice(0, preferred.length, second.permanentId);
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            instanceId: "dev-metalgreymon-evolve",
            permanentId: base.permanentId,
            alternateRequirementIndex: 0,
          }),
        ).toEqual({ ok: true });
        await settle(
          () => second.topCard.cardId === (colors === 4 ? "BT21-042" : "BT21-044") && !s.state.pendingDecision,
        );
        expect(s.state.memory).toBe(0);
        expect(first.stack).toHaveLength(colors === 4 ? 0 : 1);
        expect(second.stack).toHaveLength(colors === 4 ? 0 : 1);
        expect(
          s.decisions.filter(
            ({ req }) =>
              req.kind === "chooseTargets" &&
              req.sourceCardId === "BT21-061" &&
              (req.options?.timing === "OnPlay" || req.options?.timing === "WhenDigivolving"),
          ),
        ).toHaveLength(2);
        const timings = s.events
          .filter(
            (event) =>
              event.kind === "effectTriggered" &&
              event.sourceCardId === "BT21-061" &&
              (event.timing === "OnPlay" || event.timing === "WhenDigivolving"),
          )
          .map((event) => (event.kind === "effectTriggered" ? event.timing : undefined));
        expect(timings).toEqual(["OnPlay", "WhenDigivolving"]);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
