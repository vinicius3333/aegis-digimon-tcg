import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-108.js";
import "./BT13-111.js";
import "./BT13-058.js";
import "../BT1/BT1-110.js";
import "./BT13-106.js";
import "../BT1/BT1-015.js";
import "./BT13-112.js";

describe("BT13-108 Waltz's End", () => {
  it("grants the two opponent-turn effects and keeps the security deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
        },
      ],
    });
  });

  it("naturally deletes opposing Digimon up to the granted host play cost and grants Option immunity", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-108", as: "option" }, "BT1-009"],
          battleArea: [
            { card: "BT13-111", as: "host" },
            { card: "BT2-064", as: "other" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT13-056", as: "suspender" },
            { card: "BT1-015", as: "low" },
            { card: "BT13-112", as: "high" },
          ],
          hand: [{ card: "BT13-058", as: "mode" }, { card: "BT1-110", as: "flower" }, "BT1-009"],
          security: [
            { card: "BT13-106", as: "waltzHost" },
            { card: "BT13-106", as: "waltzOther" },
          ],
          deck: [{ card: "BT1-010", as: "turnDraw" }, { card: "BT1-011", as: "bonusDraw" }, "BT1-012"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const optionInstanceId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    const targetRequests = s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "chooseTargets");
    expect(targetRequests).toHaveLength(1);
    // BT13-108 is an Option: it resolves its Main effect and is trashed, not placed on the field.
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).customEffectGrants(s.perm("host"))).toHaveLength(2);
    expect(observe(s.engine).customEffectGrants(s.perm("other"))).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("host"), "beAffected", "Option")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("other"), "beAffected", "Option")).toBe(false);
    const flowerInstanceId = s.inst("flower").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: flowerInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const flowerDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: flowerDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === flowerInstanceId));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("suspender").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("low").instanceId)).toBe(true);
    const opponentMemoryBefore = s.state.memory;
    const opponentHandBefore = s.state.players[1]!.hand.length;
    const modeInstanceId = s.inst("mode").instanceId;
    const sourceInstanceId = s.perm("suspender").topCard.instanceId;
    const hostDP = s.perm("host").currentDP;
    const otherDP = s.perm("other").currentDP;
    // Supplemental Q2361 source-kind windows: the protected seat cannot declare a normal attack during this opponent turn.
    const hostSecurity = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("waltzHost"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const securityHostDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: securityHostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await hostSecurity;
    expect(s.perm("host").currentDP).toBe(hostDP);
    const otherSecurity = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("waltzOther"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const securityOtherDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: securityOtherDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("other").permanentId] },
      }),
    ).toEqual({ ok: true });
    await otherSecurity;
    expect(s.perm("other").currentDP).toBe(otherDP - 3000);
    expect(otherDP).toBe(12000);
    // Supplemental Q2362 precondition: Option immunity must not block the granted Digimon deletion.
    await advance(s.engine).verb.restrict(s.perm("low").permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
      fromSourceKind: ["Option"],
    });
    expect(observe(s.engine).isRestrictedByEffect(s.perm("low"), "beAffected", "Option")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("low"), "beAffected", "Digimon")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("suspender").permanentId,
        instanceId: s.inst("mode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspensionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: suspensionDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const restrictionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: restrictionDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === modeInstanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceInstanceId)).toBe(true);
    expect(s.state.memory).toBe(opponentMemoryBefore - 1);
    expect(s.state.players[1]!.hand.length).toBe(opponentHandBefore);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("high").instanceId),
    ).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).customEffectGrants(s.perm("host"))).toHaveLength(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("host"), "beAffected", "Option")).toBe(false);
  });

  it("Security deletes the opposing Digimon with the lowest play cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT13-108", as: "securityOption" }], deck: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "lowest" },
            { card: "BT2-025", as: "higher" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    // Ikkakumon costs 5 with 3000 DP; Greymon costs 4 with 4000 DP. The selection must use play cost.
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("higher").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("lowest").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("lowest").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("higher").instanceId)).toBe(
      true,
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(
      true,
    );
  });
});
