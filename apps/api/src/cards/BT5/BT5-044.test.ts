import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-044.js";

describe("BT5-044 Sakuyamon", () => {
  it("gives an opposing Digimon Security Attack -3 when it moves from breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-044", as: "sakuya", under: ["BT5-042"] }] },
      1: { breeding: { card: "BT1-009", as: "mover" }, battleArea: [{ card: "BT1-010", as: "other" }] },
    });
    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack") === -3);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(-3);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);

    // The grant is only for the turn in which the opposing Digimon moved.
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(0);
  });

  it("does not watch a breeding move during your own turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] },
      1: { breeding: { card: "BT1-009", as: "mover" } },
    });
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("mover").permanentId,
    });
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(0);
  });

  it("gives opposing Security Digimon -3000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
