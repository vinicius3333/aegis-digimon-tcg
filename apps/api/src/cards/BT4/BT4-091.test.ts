import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-091.js";

describe("BT4-091 Chaosmon: Valdur Arm", () => {
  it("applies the -7000 DP effect twice when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-024", as: "base" }], hand: [{ card: "BT4-091", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains 3 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-091", as: "chaos" }] } });
    s.state.memory = 0;
    await (s.engine as any).primitives.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });
});

describe("BT4-091 Chaosmon: Valdur Arm — KB Q&A rulings", () => {
  it("can aim both -7000 DP activations at the same Digimon (Q1244)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-024", as: "base" }], hand: [{ card: "BT4-091", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "twiceTarget", dp: 13000 },
            { card: "BT1-009", as: "bystander", dp: 13000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("twiceTarget").topCard!.instanceId);
    s.state.memory = 6;
    const twiceTargetInstanceId = s.perm("twiceTarget").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === twiceTargetInstanceId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([twiceTargetInstanceId]);
    expect(s.perm("bystander").currentDP).toBe(13000);
  });

  it("resolves both activations back to back with no other action in between (Q1245)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-024", as: "base" }], hand: [{ card: "BT4-091", as: "evolving" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 13000, suspended: true },
          { card: "BT1-009", as: "second", dp: 13000 },
        ],
      },
    });
    s.state.memory = 10;
    const chooseTarget = (permanentId: string) =>
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [permanentId] },
      });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(chooseTarget(s.perm("first").permanentId)).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 6000 && s.state.pendingDecision?.kind === "chooseTargets");

    const secondActivationId = s.state.pendingDecision!.decisionId;
    expect(s.perm("second").currentDP).toBe(13000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toMatchObject({ ok: false });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.state.pendingDecision?.decisionId).toBe(secondActivationId);

    expect(chooseTarget(s.perm("second").permanentId)).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 6000);
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("first").currentDP).toBe(6000);
    expect(s.perm("second").currentDP).toBe(6000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
  });
});
