import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT3/BT3-046.js";
import "../BT3/BT3-061.js";
import "../BT3/BT3-077.js";
import "./BT1-090.js";

describe("BT1-090 Gravity Crush", () => {
  it("gains 2 memory immediately and loses 2 memory at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-090", as: "option" }] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 2 && s.state.players[0]!.trash.some((card) => card.cardId === "BT1-090"));
    expect(s.state.memory).toBe(2);
    await advance(s.engine).runTurn(0);
    expect(s.state.memory).toBe(-5);
  });

  it("stacks one end-of-turn loss for each copy used", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-010"],
        hand: [
          { card: "BT1-090", as: "first" },
          { card: "BT1-090", as: "second" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 4);

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-7);
  });

  it("Q1080/Q1415 still loses 2 at end of turn when Terriermon blocks the initial gain", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-010"],
        hand: [{ card: "BT1-090", as: "option" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT3-046", as: "terriermon" }],
        deck: ["BT1-012"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.memory).toBe(2);
    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-5);
  });
});

describe("BT1-090 Gravity Crush — KB Q&A rulings", () => {
  const setupAgainst = (opponentBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-090", as: "option" }], deck: ["BT1-009"] },
      1: { battleArea: opponentBattleArea, deck: ["BT1-012"] },
    });
    s.state.memory = 2;
    return s;
  };

  const useGravityCrush = async (s: ReturnType<typeof setupAgainst>) => {
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
  };

  it("gains no memory against Chuumon but still loses 2 memory at end of turn (Q1087)", async () => {
    const control = setupAgainst([]);
    await useGravityCrush(control);
    expect(control.state.memory).toBe(4);

    const s = setupAgainst(["BT3-061"]);
    await useGravityCrush(s);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-5);
  });

  it("gains no memory against Gazimon but still loses 2 memory at end of turn (Q1097)", async () => {
    const control = setupAgainst([]);
    await useGravityCrush(control);
    expect(control.state.memory).toBe(4);

    const s = setupAgainst(["BT3-077"]);
    await useGravityCrush(s);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-5);
  });
});
