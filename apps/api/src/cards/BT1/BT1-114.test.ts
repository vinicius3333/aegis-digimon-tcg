import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-114.js";

describe("BT1-114 MetalGreymon", () => {
  it("has Security Attack +2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-114", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("digimon"), "SecurityAttack")).toBe(2);
  });

  it("Q990 attacks with less than 5 memory and completes all 3 security checks before the turn changes", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-114", as: "attacker" }] },
      1: {
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: ["BT1-013"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
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
    assertNoLoudGap(s);
  });

  it("gives its host +3000 DP during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", under: ["BT1-114"], as: "host", dp: 11000 }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(14000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(11000);
  });
});
