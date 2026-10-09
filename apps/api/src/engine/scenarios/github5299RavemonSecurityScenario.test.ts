import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { syncPublicCounts } from "../state/visibility.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("GitHub #5299 playable Ravemon bottom security arena", () => {
  it("places at the bottom, checks the existing top, then plays Ravemon for free at the end of the opponent turn", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
      },
    );
    layDevScenario("arena-github-5299-ravemon-bottom-security", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-5299-crowmon",
          instanceId: "dev-5299-ravemon",
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => human.security.length === 3 && s.state.pendingDecision === undefined);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual([
        "dev-5299-security-top-0",
        "dev-5299-security-hidden-0",
        "dev-5299-ravemon",
      ]);
      expect(human.security.at(-1)).toMatchObject({ cardId: "BT26-082", faceUp: true });
      expect(opponent.hand).toHaveLength(7);
      expect(opponent.battleArea.map(({ permanentId }) => permanentId)).toEqual(["dev-perm-1-5299-attacker"]);
      syncPublicCounts(s.state);
      expect(human.securityView.map(({ cardId }) => cardId)).toEqual(["BT1-009", "", "BT26-082"]);
      expect(opponent.securityView.map(({ cardId }) => cardId)).toEqual(["BT1-009", ""]);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(human.battleArea).toHaveLength(0);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: "dev-perm-1-5299-attacker",
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(human.trash.some(({ instanceId }) => instanceId === "dev-5299-security-top-0")).toBe(true);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual([
        "dev-5299-security-hidden-0",
        "dev-5299-ravemon",
      ]);
      const memoryBeforeReplay = s.state.memory;
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      expect(human.security.map(({ instanceId }) => instanceId)).toEqual(["dev-5299-security-hidden-0"]);
      expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(["dev-5299-ravemon"]);
      expect(human.trash.some(({ instanceId }) => instanceId === "dev-5299-ravemon")).toBe(false);
      expect(s.events).toContainEqual(
        expect.objectContaining({ kind: "cardPlayed", cardId: "BT26-082", fromZone: "security" }),
      );
      expect(memoryBeforeReplay).toBe(3);
      expect(s.state.memory).toBe(3);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });
});
