import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/BT13/BT13-015.js";
import "../../cards/BT13/BT13-008.js";
import "../../cards/BT12/BT12-092.js";
import "../../cards/BT4/BT4-092.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Discord 1557876784681328641 — playable Marcus security control", () => {
  it("recovers the first security-battle-deleted Marcus, respects OPT for the second, and resets next turn", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-rizegreymon-marcus-security", s.state, [BLUE_DECK, RED_DECK]);
    const firstId = "dev-field-0-rize-marcus-first";
    const secondId = "dev-field-0-rize-marcus-second";
    const thirdId = "dev-field-0-rize-marcus-next-turn";
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(8);
      expect(s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === firstId)?.currentDP).toBe(3000);
      expect(s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === secondId)?.currentDP).toBe(3000);

      for (const marcusId of [firstId, secondId]) {
        const marcus = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === marcusId)!;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: marcus.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.phase === Phase.Main &&
            s.state.pendingDecision === undefined &&
            !s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === marcusId),
        );
        expect(s.state.players[0]!.security).toHaveLength(6);
        expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: firstId, faceUp: false });
      }
      expect(s.state.players[0]!.trash.some((c) => c.instanceId === secondId)).toBe(true);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const agumon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT13-008")!;
      const effect = observe(s.engine).activatableEffects(agumon)[0]!;
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: agumon.topCard.instanceId,
          effectKey: effect.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === thirdId)?.currentDP === 3000 &&
          s.state.pendingDecision === undefined,
      );
      const third = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === thirdId)!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: third.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.security.length === 7 &&
          s.state.pendingDecision === undefined &&
          s.state.phase === Phase.Main,
      );
      // Either Marcus in trash is legal; the harness selects the older, second Marcus.
      expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: secondId, faceUp: false });
      expect(s.state.players[0]!.trash.some((c) => c.instanceId === thirdId)).toBe(true);
    } finally {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });
});
