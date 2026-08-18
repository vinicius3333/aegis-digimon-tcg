import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT3/BT3-046.js";
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
        deck: ["BT1-001"],
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
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT3-046", as: "terriermon" }],
        deck: ["BT1-002"],
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

    // Voluntarily ending with positive memory first passes the marker to -3. The
    // deferred loss still resolves afterward, taking it another 2 points to -5.
    expect(s.state.memory).toBe(-5);
  });
});
