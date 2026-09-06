import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST1/ST1-07.js";
import "./ST3-15.js";

describe("ST3-15 Holy Flame", () => {
  it("gives one opposing Digimon Security Attack -3", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-15", as: "option" }], deck: ["ST1-02", "ST1-02"] },
        1: { battleArea: [{ card: "ST3-07", as: "target" }], deck: ["ST1-02", "ST1-02"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -3);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-3);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-3);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory; // Production passTurn changes the active player's memory perspective.
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
  it("gives every opposing Digimon Security Attack -1 from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST3-15", as: "option", faceUp: true }], deck: ["ST3-02"] },
      1: {
        battleArea: [
          { card: "ST3-07", as: "first" },
          { card: "ST3-08", as: "second" },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(0);
  });

  it("prevents a direct win at 0 checks even when the attacker has Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-15", as: "option" }], deck: ["ST1-02", "ST1-02"] },
        1: { battleArea: [{ card: "ST3-09", under: ["ST1-07"], as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack") === -2);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.gameOver).toBe(false);
  });
});
