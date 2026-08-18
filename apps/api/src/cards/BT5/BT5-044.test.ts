import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-044.js";

describe("BT5-044 Sakuyamon", () => {
  it("gives an opposing Digimon Security Attack -3 when it moves from breeding", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] }, 1: { breeding: { card: "BT1-009", as: "mover" } } });
    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack") === -3);
    expect(observe(s.engine).keywordAmount(s.perm("mover"), "SecurityAttack")).toBe(-3);
  });

  it("gives opposing Security Digimon -3000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-044", as: "sakuya" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });
});
