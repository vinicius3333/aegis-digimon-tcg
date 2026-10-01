import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-062.js";
import "./BT6-065.js";
import "../P/P-194.js";

describe("BT6-062 Volcanomon", () => {
  it("gives its host Security Attack +1 while an opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-065", under: ["BT6-062"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);

    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});

describe("BT6-062 Volcanomon — KB Q&A rulings", () => {
  it("loses the inherited Security Attack +1 as soon as the only unsuspended opposing Digimon suspends to block (Q1457)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-065", under: ["BT6-062"], as: "attacker" }] },
      1: { battleArea: [{ card: "P-194", as: "blocker" }], security: 2 },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId })).toEqual({
      ok: true,
    });
    // The blocker's ＜Barrier＞ prompt pauses the battle while the suspended blocker is still in play.
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(blocker.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toContain(blocker);
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(1, { type: "respondBarrier", permanentId: blocker.permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  });
});
