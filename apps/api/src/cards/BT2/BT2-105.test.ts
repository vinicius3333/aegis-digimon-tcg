import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-081.js";
import "./BT2-091.js";
import "./BT2-105.js";

describe("BT2-105 Spider Shooter", () => {
  it("de-digivolves exactly one selected opposing Digimon by one card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-052", as: "own" }], hand: [{ card: "BT2-105", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-045", as: "first", under: ["BT2-043"] },
          { card: "BT2-046", as: "second", under: ["BT2-044"] },
        ],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("own").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT2-044");

    expect(s.perm("first").topCard.cardId).toBe("BT2-045");
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").topCard.cardId).toBe("BT2-044");
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-046")).toBe(true);
  });

  it("does nothing to an opposing Digimon without digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-052"], hand: [{ card: "BT2-105", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT2-105"));

    expect(s.perm("target").topCard.cardId).toBe("BT2-045");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("activates the same Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-105", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043"] }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").topCard.cardId).toBe("BT2-043");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-045")).toBe(true);
  });
});

describe("BT2-105 Spider Shooter — KB Q&A rulings", () => {
  async function attackIntoSecurity(securityCard: string) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-076"] }] },
        1: { security: [securityCard], battleArea: ["BT2-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !combat.combat.isAttacking);
    await drainMicrotasks();
    return s;
  }

  it("prevents the attacker's [End of Attack] effect when its De-Digivolve trashes that card during the security check (Q3247)", async () => {
    const control = await attackIntoSecurity("BT2-091");
    expect(control.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-091")).toBe(true);
    expect(control.perm("attacker").topCard.cardId).toBe("BT1-081");
    expect(control.perm("attacker").isSuspended).toBe(false);
    expect(control.state.memory).toBe(6);

    const s = await attackIntoSecurity("BT2-105");
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-076");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-081")).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
  });
});
