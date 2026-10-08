import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("GitHub #5311 and #5318 playable cost-scope arenas", () => {
  it("#5311 sweep: real turn loop discounts incoming Imperialdramon only and preserves Piercing", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-github5311-imperialdramon-cost-scope", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5311-paildramon-incoming",
          instanceId: "github5311-imperialdramon",
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "github5311-imperialdramon"),
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(5);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5311-paildramon-control",
          instanceId: "github5311-metalgarurumon",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-044"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      const dragons = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT3-111");
      expect(dragons).toHaveLength(2);
      for (const permanent of dragons) {
        expect(observe(s.engine).hasPierce(permanent)).toBe(true);
      }
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("#5311: real turn loop discounts incoming Crescemon but charges outgoing level 6 in full", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
    layDevScenario("arena-github5311-crescemon-cost-scope", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5311-base",
          instanceId: "github5311-crescemon",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "github5311-crescemon"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(5);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5311-source",
          instanceId: "github5311-metalgarurumon",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-044"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("#5318: real turn loop plays Angemon after Junomon removes security while excluding both Venusmon copies", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-github5318-junomon-printed-cost", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-github5318-base",
          instanceId: "github5318-junomon",
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "github5318-angel"));
      await drainMicrotasks();
      expect(s.state.memory).toBe(6);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain("github5318-venusmon-hand");
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain("github5318-venusmon-trash");
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-040")).toBe(false);
      const freePlayDecisions = s.decisions.filter(({ req }) =>
        req.options?.candidateInstanceIds?.includes("github5318-angel"),
      );
      expect(freePlayDecisions.length).toBeGreaterThan(0);
      for (const { req } of freePlayDecisions) {
        expect(req.options?.candidateInstanceIds).not.toContain("github5318-venusmon-hand");
        expect(req.options?.candidateInstanceIds).not.toContain("github5318-venusmon-trash");
      }
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
