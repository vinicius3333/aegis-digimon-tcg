import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-076.js";
import "./BT1-081.js";
import "./BT1-112.js";

describe("BT1 HerculesKabuterimon historical deck gauntlet", () => {
  it("uses Dimension Scissor repeatedly across two Piercing battles, then attacks the player", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-081",
              as: "herculesKabuterimon",
              under: ["BT1-076"],
            },
          ],
          hand: [{ card: "BT1-112", as: "dimensionScissor" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget", suspended: true },
            { card: "BT1-011", as: "secondTarget", suspended: true },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-001"],
        },
      },
      {
        autoDeclineOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("herculesKabuterimon").permanentId);
    s.state.memory = 4;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dimensionScissor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("dimensionScissor").instanceId) &&
        observe(s.engine).subscriptions("whenDeletesInBattle", s.perm("herculesKabuterimon").permanentId).length === 1,
    );
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("herculesKabuterimon").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId) &&
        s.state.players[1]!.security.length === 2 &&
        !s.perm("herculesKabuterimon").isSuspended &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("herculesKabuterimon").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId) &&
        s.state.players[1]!.security.length === 1 &&
        !s.perm("herculesKabuterimon").isSuspended &&
        !observe(s.engine).isAttacking(),
    );

    // Q984: the granted effect is not once per turn and can restand after both deletions.
    expect(s.state.memory).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("herculesKabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("herculesKabuterimon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
