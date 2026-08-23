import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-046.js";
import "./BT2-051.js";
import "./BT2-088.js";
import "../P/P-057.js";

describe("BT2 RustTyrannomon Taiga promo deck gauntlet", () => {
  it("pierces an unsuspended level 6, restands, and exposes duplicate suspend targets to the UI", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT2-051",
            as: "rustTyrannomon",
            under: ["P-057", "BT2-046"],
          },
          { card: "BT2-088", as: "taiga" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-080", as: "unsuspendedLevelSix" },
          { card: "BT1-017", as: "firstCopy" },
          { card: "BT1-017", as: "secondCopy" },
        ],
        security: ["BT1-009", "BT1-010"],
        deck: ["BT1-001"],
      },
    });
    const attackerId = s.perm("rustTyrannomon").permanentId;
    const defenderId = s.perm("unsuspendedLevelSix").permanentId;
    const firstCopyId = s.perm("firstCopy").permanentId;
    const secondCopyId = s.perm("secondCopy").permanentId;
    await s.ready();

    expect(s.perm("rustTyrannomon").currentDP).toBe(s.perm("rustTyrannomon").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("rustTyrannomon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets", 5000);
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("chooseTargets");
    const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
    expect(request?.sourceCardId).toBe("BT2-051");
    expect(new Set(request?.options?.candidateInstanceIds ?? [])).toEqual(new Set([firstCopyId, secondCopyId]));

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [secondCopyId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId) &&
        s.state.players[1]!.security.length === 1 &&
        !s.perm("rustTyrannomon").isSuspended,
      5000,
    );

    expect(s.perm("firstCopy").isSuspended).toBe(false);
    expect(s.perm("secondCopy").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("rustTyrannomon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
