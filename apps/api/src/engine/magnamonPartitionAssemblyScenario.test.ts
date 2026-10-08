import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("GitHub #5294 playable Magnamon Partition Assembly arena", () => {
  it.each([true, false])(
    "offers optional Assembly after security activates Partition; accepted=%s",
    async (accepted) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: accepted ? [] : ["Paildramon"] },
      );
      layDevScenario("arena-ex13-magnamon-partition-assembly", s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const holder = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "AD1-011")!;
        const magnamonId = holder.stack.find((c) => c.cardId === "EX13-020")!.instanceId;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: holder.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.events.some((event) => event.kind === "attackEnded") &&
            !observe(s.engine).isAttacking() &&
            s.state.pendingDecision === undefined,
        );
        const magnamon = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === magnamonId)!;
        expect(magnamon.stack.map((c) => c.instanceId)).toEqual(accepted ? ["dev-magnamon-veemon"] : []);
        expect(s.state.players[0]!.trash.some((c) => c.instanceId === "dev-magnamon-veemon")).toBe(!accepted);
        expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual(["BT1-071", "EX13-020"]);
        expect(s.state.memory).toBe(5);
        expect(s.decisions.filter(({ req }) => req.options?.assemblyCardId === "EX13-020")).toMatchObject([
          { seat: 0, req: { options: { min: 0, max: 1, candidateInstanceIds: ["dev-magnamon-veemon"] } } },
        ]);
        expect(s.state.players[0]!.trash.some((c) => c.instanceId === "dev-magnamon-decoy")).toBe(true);
        assertNoLoudGap(s);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
