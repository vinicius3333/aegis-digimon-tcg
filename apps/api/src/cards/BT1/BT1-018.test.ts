import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-018.js";
import "../ST2/ST2-13.js";

describe("BT1-018 Flarerizamon", () => {
  it("gains Security Attack +1 while its controller has 3 or more memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-018", as: "digimon" }] } });
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(true);
  });

  it("does not gain Security Attack +1 with only 2 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-018", as: "digimon" }] } });
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(false);
  });

  it("does not gain Security Attack +1 during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-018", as: "digimon" }] } });
    s.state.turnSeat = 1;
    s.state.memory = -3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(false);
  });

  it("stops after the first check when Hammer Spark drops its memory below 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-018", as: "attacker" }] },
      1: { security: ["ST2-13", "BT1-001"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "SecurityAttack")).toBe(false);
  });
});
