import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Thetismon arena (Discord 1556410279602946198)", () => {
  it.each([
    { scenario: "arena-ex12-thetismon-mistymon-deletion", deleted: true },
    { scenario: "arena-ex12-thetismon-jamming-control", deleted: false },
  ] as const)("reproduces $scenario through the turn loop", async ({ scenario, deleted }) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const attacker = s.state.players[0]!.battleArea[0]!;
      expect(attacker.topCard.cardId).toBe("EX12-030");
      expect(attacker.stack.map(({ cardId }) => cardId)).toEqual(["RB1-002", "LM-002", "EX12-027"]);
      expect(observe(s.engine).hasKeyword(attacker, "Jamming")).toBe(true);
      expect(s.state.players[0]!.hand).toHaveLength(7);
      expect(s.state.players[1]!.security).toHaveLength(3);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision);

      expect(s.state.players[0]!.battleArea).toHaveLength(deleted ? 0 : 1);
      expect(s.state.players[0]!.hand).toHaveLength(8);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["EX13-033"]);
      const checked = s.events.find((event) => event.kind === "securityChecked");
      expect(checked).toMatchObject({ revealedCardId: "EX13-033", resolution: deleted ? "trashed" : "battle" });
      expect(checked?.battle).toEqual(
        deleted
          ? undefined
          : { attackerDeleted: false, securityDigimonDeleted: true, attackerDP: 7000, securityCardDP: 7000 },
      );
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
        deleted ? ["BT1-032", "RB1-002", "LM-002", "EX12-027", "EX12-030"] : ["BT1-032"],
      );
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
        deleted ? ["EX13-033", "BT18-030"] : [],
      );
      const securitySequence = s.events
        .filter(
          (event) =>
            event.kind === "securityRevealed" ||
            event.kind === "securityChecked" ||
            ((event.kind === "effectTriggered" || event.kind === "effectResolved") &&
              event.sourceCardId === "EX13-033") ||
            (event.kind === "cardsMoved" &&
              event.deletedPermanents?.some(({ permanentId }) => permanentId === attacker.permanentId)),
        )
        .map(({ kind }) => kind);
      expect(securitySequence).toEqual(
        deleted
          ? ["securityRevealed", "effectTriggered", "cardsMoved", "effectResolved", "securityChecked"]
          : ["securityRevealed", "securityChecked"],
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
