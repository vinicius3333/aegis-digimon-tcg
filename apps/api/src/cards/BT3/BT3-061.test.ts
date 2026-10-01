import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-061.js";
import "../BT1/BT1-021.js";
import "../BT1/BT1-090.js";
import "../ST2/ST2-13.js";

describe("BT3-061 Chuumon", () => {
  it("prevents the opponent from gaining memory through a security Option effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-061", as: "chuumon" },
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
});

describe("BT3-061 Chuumon — KB Q&A rulings", () => {
  const attackWithMetalGreymon = async (opponentBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "metalGreymon" }], deck: ["BT1-009"] },
      1: { battleArea: opponentBattleArea, security: ["BT1-010"], deck: ["BT1-012"] },
    });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    const memoryValuesDuringTurn = s.events.flatMap((event) => (event.kind === "memoryChanged" ? [event.to] : []));
    return { highestMemory: Math.max(...memoryValuesDuringTurn), memoryAfterTurn: s.state.memory };
  };

  const useGravityCrush = async (opponentBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-090", as: "gravityCrush" }], deck: ["BT1-009"] },
      1: { battleArea: opponentBattleArea, deck: ["BT1-012"] },
    });
    s.state.memory = 2;
    const optionId = s.inst("gravityCrush").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    const memoryAfterOption = s.state.memory;
    await advance(s.engine).runTurn(0);
    return { memoryAfterOption, memoryAfterTurn: s.state.memory };
  };

  it("blocks the opponent's memory gains from Option and Digimon effects but not their end-of-turn memory loss (Q1087)", async () => {
    const optionControl = await useGravityCrush([]);
    expect(optionControl.memoryAfterOption).toBe(4);
    const optionAgainstChuumon = await useGravityCrush(["BT3-061"]);
    expect(optionAgainstChuumon.memoryAfterOption).toBe(2);
    // Passing leaves the opponent at 3; Gravity Crush's end-of-turn loss of 2 then moves it to 5.
    expect(optionAgainstChuumon.memoryAfterTurn).toBe(-5);
    expect(optionAgainstChuumon.memoryAfterTurn).toBe(optionControl.memoryAfterTurn);

    const digimonControl = await attackWithMetalGreymon([]);
    expect(digimonControl.highestMemory).toBe(3);
    const digimonAgainstChuumon = await attackWithMetalGreymon(["BT3-061"]);
    expect(digimonAgainstChuumon.highestMemory).toBeLessThanOrEqual(0);
    expect(digimonAgainstChuumon.memoryAfterTurn).toBe(-6);
    expect(digimonAgainstChuumon.memoryAfterTurn).toBe(digimonControl.memoryAfterTurn);
  });

  it("gives the opponent no memory from Hammer Spark's security effect (Q1088)", async () => {
    const checkHammerSpark = async (attackerBattleArea: string[]) => {
      const s = setupEngine({
        0: { battleArea: [...attackerBattleArea, { card: "BT1-019", as: "attacker" }] },
        1: { security: ["ST2-13"] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && s.state.players[1]!.trash.length === 1, 5000);
      return s.state.memory;
    };

    expect(await checkHammerSpark([])).toBe(1);
    expect(await checkHammerSpark(["BT3-061"])).toBe(3);
  });
});
