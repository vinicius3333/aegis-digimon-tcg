import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-074.js";

describe("P-074 Boutmon", () => {
  it("trashes a chosen 3 security to make an otherwise unaffordable Shaman digivolution cost 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: ["BT1-009", "BT1-009", "BT1-028"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 3 },
    );
    s.state.memory = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boutmon").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("boutmon").topCard.cardId === "BT10-042" &&
        s.state.players[0]!.security.length === 0 &&
        s.state.memory === 0,
      2_000,
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("may choose zero security and pay the full Shaman digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: ["BT1-009", "BT1-009", "BT1-028"],
          deck: ["BT1-028"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boutmon").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT10-042" && s.state.memory === 0, 2_000);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("does not offer the security reduction for a non-Shaman/non-Wizard evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-074", as: "boutmon" }],
        hand: [{ card: "BT2-041", as: "shineGreymon" }],
        security: ["BT1-009", "BT1-009", "BT1-028"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boutmon").permanentId,
        instanceId: s.inst("shineGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT2-041");

    expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(-3);
  });

  it("unsuspends its host once per turn only at exactly 3 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-062", as: "host", under: ["P-074"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-009", "BT1-010"],
        security: 3,
      },
      1: {
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-009", "BT1-010"],
        battleArea: [
          { card: "BT1-009", as: "first", suspended: true, dp: 1000 },
          { card: "BT1-010", as: "second", suspended: true, dp: 1000 },
          { card: "BT1-011", as: "third", suspended: true, dp: 1000 },
        ],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const thirdId = s.perm("third").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await (
      s.engine as unknown as { primitives: { unsuspend(permanentIds: string[]): Promise<void> } }
    ).primitives.unsuspend([s.perm("host").permanentId]);
    await (
      s.engine as unknown as { primitives: { suspend(permanentIds: string[]): Promise<void> } }
    ).primitives.suspend([s.perm("third").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("third").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("host").isSuspended &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === thirdId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === thirdId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
