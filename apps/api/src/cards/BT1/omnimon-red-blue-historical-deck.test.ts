import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-084.js";

describe("BT1 Omnimon red-blue historical deck", () => {
  it("identifies same-name stacks by permanent, wipes every MetalGreymon, and pays the restand cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "warGreymon" }],
          hand: [{ card: "BT1-084", as: "omnimon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "emptyMetalGreymon" },
            { card: "ST1-09", as: "oneSourceMetalGreymon", under: ["BT1-010"] },
            { card: "BT1-114", as: "twoSourceMetalGreymon", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-023", as: "differentName" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sameNamePermanentIds = [
      s.perm("emptyMetalGreymon").permanentId,
      s.perm("oneSourceMetalGreymon").permanentId,
      s.perm("twoSourceMetalGreymon").permanentId,
    ];
    const warGreymonInstanceId = s.perm("warGreymon").topCard.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGreymon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        sameNamePermanentIds.every(
          (permanentId) => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === permanentId),
        ) && s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("differentName").permanentId,
    ]);
    expect(s.state.memory).toBe(4);

    const omnimon = s.perm("warGreymon");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: omnimon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === warGreymonInstanceId) &&
        !omnimon.isSuspended &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 1,
    );

    expect(omnimon.stack).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: omnimon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
