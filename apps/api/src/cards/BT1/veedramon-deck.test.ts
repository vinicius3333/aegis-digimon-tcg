import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-115.js";
import "../ST8/ST8-10.js";

describe("BT1/ST8 Veedramon and UlforceVeedramon deck", () => {
  it("separates the any-Tamer restand from the single blue-Tamer inherited DP bonus", async () => {
    const s = setupEngine({
      0: {
        hand: Array.from({ length: 8 }, () => "ST8-02"),
        battleArea: [
          { card: "BT1-115", as: "secVeedramon", dp: 20000 },
          {
            card: "ST8-10",
            as: "ulforce",
            under: ["BT1-115"],
          },
          { card: "BT1-085", as: "redTamer" },
          { card: "BT1-086", as: "blueTamerA" },
          { card: "BT1-086", as: "blueTamerB" },
        ],
      },
      1: {
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();

    // BT1-115's inherited aura is a single +1000 while the condition is true; two
    // blue Tamers do not stack the same inherited effect twice.
    expect(s.perm("ulforce").currentDP).toBe(13000);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("secVeedramon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 3 &&
        !s.perm("secVeedramon").isSuspended &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ulforce").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 2 &&
        !s.perm("ulforce").isSuspended &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    assertNoLoudGap(s);
  });
});
