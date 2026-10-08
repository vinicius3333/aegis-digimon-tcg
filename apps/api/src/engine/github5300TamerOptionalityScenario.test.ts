import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const TAMER = "dev-perm-0-github5300-tamer";
const BASE = "dev-perm-0-github5300-base";

describe("GitHub #5300 playable Tamer optionality arenas", () => {
  it("Yoshino: real turn loop lets the player pay suspension and decline digivolution", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        declinePrompts: ["Place 1 card(s) from hand", "top card of your deck"],
      },
    );
    layDevScenario("arena-github5300-yoshino-cost-payload", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-github5300-trigger" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      if (s.decisions.at(-1)?.req.sourceCardId === "ST24-09") {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response: { kind: "optional", accept: false },
          }),
        ).toEqual({ ok: true });
        await settle(
          () => s.decisions.at(-1)?.req.sourceCardId === "BT26-091" && s.state.pendingDecision?.kind === "optional",
        );
      }
      expect(s.decisions.at(-1)?.req.sourceCardId).toBe("BT26-091");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.find((p) => p.permanentId === TAMER)?.isSuspended);
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks();
      expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === BASE)?.topCard.cardId).toBe("BT26-039");
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === "dev-github5300-evolution")).toBe(true);
      expect(s.state.memory).toBe(6);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("Keenan: real turn loop keeps the Execute payload mandatory after payment", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layDevScenario("arena-github5300-keenan-cost-execute", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-github5300-trigger" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      const base = s.state.players[0]!.battleArea.find((p) => p.permanentId === BASE)!;
      await settle(() => observe(s.engine).hasKeyword(base, "Execute") && s.state.pendingDecision === undefined);
      const targets = s.decisions.filter(({ req }) => req.sourceCardId === "BT26-094" && req.kind === "chooseTargets");
      expect(targets).toHaveLength(1);
      expect(targets[0]?.req.options).toMatchObject({ min: 1, max: 1 });
      expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === TAMER)?.isSuspended).toBe(true);
      expect(s.state.memory).toBe(5);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
