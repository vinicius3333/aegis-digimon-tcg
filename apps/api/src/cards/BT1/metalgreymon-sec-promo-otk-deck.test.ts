import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-009.js";
import "../ST1/ST1-03.js";
import "../ST1/ST1-12.js";
import "./BT1-114.js";

describe("BT1 MetalGreymon SEC promo OTK deck", () => {
  it("crosses the memory gauge on declaration but finishes all three security checks before the attack ends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-114",
            as: "metalGreymon",
            under: ["ST1-03", "P-009"],
          },
          { card: "ST1-12", as: "tai" },
        ],
      },
      1: {
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: ["BT1-013"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    // Promo Agumon, starter Agumon, and Tai all apply before combat.
    expect(s.perm("metalGreymon").currentDP).toBe(13_000);
    expect(observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === -3 &&
        s.state.players[1]!.security.length === 1 &&
        s.events.some(({ kind }) => kind === "combatResolved"),
      5000,
    );

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.perm("metalGreymon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
