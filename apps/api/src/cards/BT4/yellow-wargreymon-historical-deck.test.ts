import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-048.js";
import "./BT4-097.js";
import "./BT4-104.js";

describe("BT4 yellow WarGreymon historical deck gauntlet", () => {
  it("converts security into a restand, DP deletion, Kari memory, and Blinding Ray", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-048", as: "warGreymon" },
            { card: "BT4-097", as: "kari" },
          ],
          hand: [{ card: "BT4-104", as: "blindingRay" }],
          security: [
            { card: "BT1-001", as: "warGreymonSecurity" },
            { card: "BT1-002", as: "blindingRaySecurity" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-012", as: "dpTarget" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    const dpTargetId = s.perm("dpTarget").permanentId;
    const dpTargetInstanceId = s.perm("dpTarget").topCard.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("warGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 2 &&
      !observe(s.engine).isAttacking() &&
      !s.perm("warGreymon").isSuspended &&
      s.perm("kari").isSuspended &&
      s.state.memory === 1 &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) =>
        permanentId === dpTargetId
      )
    );

    expect(s.state.players[0]!.hand.some(({ instanceId }) =>
      instanceId === s.inst("warGreymonSecurity").instanceId
    )).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) =>
      instanceId === dpTargetInstanceId
    )).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("warGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.perm("warGreymon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blindingRay").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.memory === 3);

    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) =>
      instanceId === s.inst("blindingRaySecurity").instanceId
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
