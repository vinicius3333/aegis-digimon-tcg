import { describe, expect, it } from "vitest";
import "#api/cards/index";
import establishedFixture from "#api/engine/scenarios/drill-overclock.fixture";
import fixture from "#api/engine/scenarios/overclock-attacker-played-this-turn.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

describe("Overclock on a Digimon played this turn", () => {
  it("warns that no attack follows, and still lets the cost be paid", async () => {
    const s = setupScenario(fixture);
    await s.ready();
    const player = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const activation = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
      expect(activation.sourceCardId).toBe("ST19-08");
      expect(activation.options).toMatchObject({ promptKey: "attackUnavailable", selectionContext: "attackSource" });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: activation.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1);
      expect(player.trash.map((card) => card.cardId)).toContain("ST19-03");
      expect(s.perm("shoeShoemon").isSuspended).toBe(false);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
      expect(opponent.security).toHaveLength(1);
      expect(s.state.gameOver).toBe(false);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });

  it("keeps the other Digimon when the player declines", async () => {
    const s = setupScenario(fixture);
    await s.ready();
    const player = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const activation = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: activation.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1);
      expect(player.trash.map((card) => card.cardId)).not.toContain("ST19-03");
      expect(s.perm("shoemon").permanentId).toBeDefined();
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });

  it("gives no warning when the Digimon can attack", async () => {
    const s = setupScenario(establishedFixture);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const activation = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
      expect(activation.options?.selectionContext).toBe("attackSource");
      expect(activation.options?.promptKey).toBeUndefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: activation.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });
});
