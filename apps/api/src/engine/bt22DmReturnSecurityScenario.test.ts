import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("Discord 1557652222744199228 BT22 DM arena turn loop", () => {
  for (const target of ["tamer", "ace"] as const) {
    it(`Vademon returns the opponent's ${target} with the correct Overflow owner`, async () => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layDevScenario(`arena-bt22-vademon-return-${target}`, s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(3);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: "dev-perm-0-dm-vademon",
            target:
              target === "tamer" ? { kind: "player" } : { kind: "permanent", permanentId: "dev-perm-1-dm-target" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[1]!.hand.some((card) => card.instanceId === "dev-field-1-dm-target") &&
            s.state.pendingDecision === undefined &&
            !observe(s.engine).isAttacking(),
        );
        expect(s.state.players[0]!.trash.some((card) => card.instanceId === "dev-dm-payment")).toBe(true);
        expect(s.state.players[0]!.hand.some((card) => card.instanceId === "dev-field-1-dm-target")).toBe(false);
        expect(s.state.memory).toBe(target === "ace" ? 6 : 3);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          target === "ace" ? 1 : 0,
        );
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }

  for (const target of ["own", "opponent"] as const) {
    it(`ShinMonzaemon places the ${target} Digimon in its owner's security`, async () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
      layDevScenario(`arena-bt22-shinmonzaemon-${target}-security`, s.state, [BLUE_DECK, RED_DECK]);
      const owner = target === "own" ? 0 : 1;
      const other = owner === 0 ? 1 : 0;
      const targetId = `dev-field-${owner}-dm-target`;
      preferInstanceIds.push(targetId);
      const otherSecurity = s.state.players[other]!.security.map((card) => card.instanceId);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: "dev-perm-0-dm-monzaemon",
            instanceId: "dev-dm-shin",
          }),
        ).toEqual({ ok: true });
        await settle(
          () => s.state.players[owner]!.security[0]?.instanceId === targetId && s.state.pendingDecision === undefined,
        );
        expect(s.state.players[owner]!.security[0]?.faceUp).toBe(false);
        expect(s.state.players[owner]!.security).toHaveLength(6);
        expect(s.state.players[other]!.security.map((card) => card.instanceId)).toEqual(otherSecurity);
        expect(s.state.players[owner]!.trash.some((card) => card.instanceId === `dev-stack-${owner}-dm-target-0`)).toBe(
          true,
        );
        expect(s.state.players[0]!.trash.some((card) => card.instanceId === "dev-dm-payment")).toBe(true);
        expect(s.state.memory).toBe(5);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          0,
        );
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});
