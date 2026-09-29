import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-046.js";
import "../BT1/BT1-021.js";
import "../ST2/ST2-13.js";

describe("BT3-046 Terriermon", () => {
  it("prevents the opponent from gaining memory through a security Option effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-046", as: "terriermon" },
          { card: "BT1-019", as: "attacker" },
        ],
      },
      1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.memory).toBe(0);
  });

  it("blocks opposing non-Tamer effect memory while allowing Tamer and own effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-046", as: "terriermon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});

describe("BT3-046 Terriermon — KB Q&A rulings", () => {
  const attackWithMetalGreymon = async (opponentBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "metalGreymon" }], deck: ["BT1-009"] },
      1: { battleArea: opponentBattleArea, security: ["BT1-009"], deck: ["BT1-012"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    return s;
  };

  it("blocks the opponent's Digimon-effect memory gain but not its end-of-turn memory loss (Q1080)", async () => {
    const control = await attackWithMetalGreymon([]);
    expect(control.state.memory).toBe(5);

    const s = await attackWithMetalGreymon(["BT3-046"]);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).runTurn(0);

    // Passing sets the gauge to 3 on the opponent's side (-3); the end-of-turn loss of 3 still applies.
    expect(s.state.memory).toBe(-6);
  });

  it("stops the opponent from gaining memory with Hammer Spark's [Security] effect (Q1081)", async () => {
    const checkHammerSpark = async (attackerSideCards: string[]) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-019", as: "attacker" }, ...attackerSideCards] },
        1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
      });
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("hammerSpark").instanceId) &&
          !observe(s.engine).isAttacking(),
      );
      return s;
    };

    const control = await checkHammerSpark([]);
    expect(control.state.memory).toBe(-2);

    const s = await checkHammerSpark(["BT3-046"]);
    expect(s.state.memory).toBe(0);
  });
});
