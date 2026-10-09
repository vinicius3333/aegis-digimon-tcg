import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("GitHub #5313 Inori memory arenas", () => {
  it.each(["arena-github5313-inori-memory-four", "arena-github5313-inori-memory-five"] as const)(
    "%s keeps gains confined to the printed owner Main entry",
    async (scenario) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
      const [inori, aegiomon] = s.state.players[0]!.battleArea;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        const startingMemory = scenario === "arena-github5313-inori-memory-four" ? 4 : 5;
        expect(s.state.memory).toBe(startingMemory);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(5);
        const gains = s.events.filter((event) => event.kind === "memoryChanged" && event.to > event.from);
        expect(gains).toHaveLength(startingMemory === 4 ? 1 : 0);
        const afterMainEntry = s.events.length;
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-github5313-unrelated" })).toEqual({
          ok: true,
        });
        await settle(() =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "dev-github5313-unrelated"),
        );
        await drainMicrotasks();
        expect(s.state.memory).toBe(3);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: aegiomon!.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
        expect(
          s.engine.applyIntent(0, { type: "respondBarrier", permanentId: aegiomon!.permanentId, accept: true }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            aegiomon!.topCard.cardId === "BT24-014" &&
            !observe(s.engine).isAttacking() &&
            s.state.pendingDecision === undefined,
        );
        expect(inori!.isSuspended).toBe(true);
        expect(aegiomon!.stack.map((c) => c.cardId)).toEqual(["P-194"]);
        expect(s.state.players[0]!.security).toHaveLength(4);
        expect(s.state.players[1]!.security).toHaveLength(3);
        expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
        expect(s.state.memory).toBe(3);
        expect(s.events.slice(afterMainEntry).filter((event) => event.kind === "memoryChanged")).toMatchObject([
          { from: 5, to: 3, reason: "payCost" },
          { from: 5, to: 3, reason: "playCard" },
        ]);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
        const beforeOpponentMain = s.events.length;
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(s.state.memory).toBe(3);
        expect(s.events.slice(beforeOpponentMain).filter((event) => event.kind === "memoryChanged")).toEqual([]);
        expect(
          s.events
            .slice(beforeOpponentMain)
            .filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT24-084"),
        ).toEqual([]);
        expect(s.state.pendingDecision).toBeUndefined();
        assertNoLoudGap(s);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
