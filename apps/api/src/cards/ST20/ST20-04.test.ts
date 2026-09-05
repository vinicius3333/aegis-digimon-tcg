import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-04.js";

describe("ST20-04 Garudamon", () => {
  it("inherits Alliance and resolves the ally cost across two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-10", as: "host", under: ["ST20-04"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["ST1-11", "ST1-11"], deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    const host = s.perm("host");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("grants Security Attack +1 and +2000 DP per two Tamer colors on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "target" },
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("does not scale DP when no Tamer colors are present, while still granting Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "target" }],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("grants Alliance and opens the optional attack after another Adventure is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-04", as: "garudamon" }], hand: [{ card: "ST20-07", as: "played" }] },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003", "BT1-004"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const combat = (
      s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string } }
    ).combat;
    await settle(() => {
      const pending = s.state.pendingDecision;
      if (pending?.kind === "optional")
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: true },
        });
      return combat.hasOpenAllianceDecision;
    });
    const attackerId = combat.allianceDecisionPermanentId;
    const allyId =
      attackerId === s.perm("garudamon").permanentId ? s.perm("played").permanentId : s.perm("garudamon").permanentId;
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: allyId } as never)).toEqual({
      ok: true,
    });
    await settle(() => (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat.hasOpenBlockWindow);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === allyId)?.isSuspended).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
