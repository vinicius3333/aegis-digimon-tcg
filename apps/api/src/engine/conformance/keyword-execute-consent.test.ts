import { beforeEach, describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Execute public consent", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0257",
      "16-38: Execute is an optional end-of-turn attack, permits an unsuspended Digimon target, and deletes the attacker at attack end",
      "5c658ed9c22510cf864a100b7cd55942c1109a0ceb63e0d432650f8214d68fcb",
    );
  });

  it("declines the natural End of Your Turn Execute attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-072", as: "executor" }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const executor = s.perm("executor");
    const executorId = executor.topCard.instanceId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const turn = s.engine.runOneTurn();
    await settle(() => (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(JSON.stringify(decision)).toMatch(/Execute|attack/i);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === executorId && !p.isSuspended)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === executorId)).toBe(false);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("accepts Execute and chooses an unsuspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-072", as: "executor" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
        security: [{ card: "BT1-010", as: "security" }],
      },
    });
    await s.ready();
    const executorId = s.inst("executor").instanceId;
    const target = s.perm("target");
    const targetId = target.permanentId;
    const targetCardId = target.topCard.instanceId;
    const securityId = s.inst("security").instanceId;
    const turn = s.engine.runOneTurn();
    await settle(() => (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const executeDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: executeDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    const targetDecision = s.state.pendingDecision!;
    expect(targetDecision.kind).toBe("selectCards");
    expect(JSON.stringify(targetDecision)).toContain(targetId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [targetId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);
    await turn;
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(executorId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === executorId)).toBe(false);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(targetCardId);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityId]);
  });
});
