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
    s.state.memory = -s.state.memory;
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
    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => combat.hasOpenBlockWindow);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.gameOver).toBe(false);
  });
});

describe("ST3-15 Holy Flame — KB Q&A rulings", () => {
  async function attackPlayerAfterHolyFlame({
    holyFlame,
    attacker,
    defenderSecurity,
  }: {
    holyFlame: boolean;
    attacker: { card: string; under?: string[] };
    defenderSecurity: string[];
  }) {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST3-10"],
          hand: holyFlame ? [{ card: "ST3-15", as: "option" }] : [],
          security: defenderSecurity,
          deck: ["ST1-02", "ST1-02"],
        },
        1: { battleArea: [{ ...attacker, as: "attacker" }], deck: ["ST1-02", "ST1-02"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const played = holyFlame
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })
      : { ok: true };
    expect(played).toEqual({ ok: true });
    await settle(
      () => !holyFlame || s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId),
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() || s.state.gameOver);
    return s;
  }

  it("ends the battle without a win when a 0-check Digimon attacks a player with no security (Q644)", async () => {
    const blocked = await attackPlayerAfterHolyFlame({
      holyFlame: true,
      attacker: { card: "ST3-09" },
      defenderSecurity: [],
    });
    expect(observe(blocked.engine).keywordAmount(blocked.perm("attacker"), "SecurityAttack")).toBe(-3);
    expect(blocked.state.gameOver).toBe(false);
    expect(blocked.state.winnerSeat).toBe(-1);

    const control = await attackPlayerAfterHolyFlame({
      holyFlame: false,
      attacker: { card: "ST3-09" },
      defenderSecurity: [],
    });
    expect(control.state.gameOver).toBe(true);
    expect(control.state.winnerSeat).toBe(1);
  });

  it("still checks 0 security cards when a Digimon with Security Attack -3 also has Security Attack +1 (Q645)", async () => {
    const reduced = await attackPlayerAfterHolyFlame({
      holyFlame: true,
      attacker: { card: "ST3-09", under: ["ST1-07"] },
      defenderSecurity: ["ST1-02", "ST1-02"],
    });
    expect(observe(reduced.engine).keywordAmount(reduced.perm("attacker"), "SecurityAttack")).toBe(-2);
    expect(reduced.state.players[0]!.security).toHaveLength(2);
    expect(reduced.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("ST1-02");

    const control = await attackPlayerAfterHolyFlame({
      holyFlame: false,
      attacker: { card: "ST3-09", under: ["ST1-07"] },
      defenderSecurity: ["ST1-02", "ST1-02"],
    });
    expect(control.state.players[0]!.security).toHaveLength(0);
  });
});
