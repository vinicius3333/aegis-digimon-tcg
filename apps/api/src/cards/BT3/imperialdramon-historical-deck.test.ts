import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-002.js";
import "./BT3-021.js";
import "./BT3-027.js";
import "./BT3-031.js";

describe("BT3 Imperialdramon historical deck gauntlet", () => {
  it("reduces evolution, restands the Jamming board, draws once, and attacks twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT3-027",
              as: "paildramon",
              suspended: true,
              under: ["BT3-002"],
            },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [{ card: "BT3-031", as: "imperialdramon" }],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "BT1-002", as: "attackDraw" },
          ],
        },
        1: {
          security: ["BT1-084", "BT1-010", "BT1-011"],
          deck: ["BT1-003"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("paildramon").permanentId,
        instanceId: s.inst("imperialdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 0 &&
        !s.perm("paildramon").isSuspended &&
        !s.perm("veemon").isSuspended &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolutionDraw").instanceId),
    );
    await s.engine.recomputeContinuousEffects();
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("paildramon"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking() &&
        !s.perm("paildramon").isSuspended &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("attackDraw").instanceId),
    );

    // Jamming keeps Imperialdramon alive against the 15000 DP security Omnimon.
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("paildramon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.perm("paildramon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
