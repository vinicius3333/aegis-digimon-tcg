import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-087.js";

function fireTiming(setup: EngineSetup, timing: EffectTiming): Promise<void> {
  return (setup.engine as unknown as { fireTiming(value: EffectTiming): Promise<void> }).fireTiming(timing);
}

describe("BT21-087 Zenith", () => {
  it("models one Vemmon-text selection with the alternative free-play destination", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "trash",
      add: [
        {
          count: 1,
          to: "hand",
          orDispositions: [{ to: "play", filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] } }],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("adds a card that mentions Vemmon and trashes every revealed remainder", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-087", as: "zenith" }],
          deck: [
            { card: "BT11-065", as: "vemmonText" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-009", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await fireTiming(setup, EffectTiming.OnPlay);

    expect(setup.state.players[0]?.hand.some((card) => card.instanceId === setup.inst("vemmonText").instanceId)).toBe(
      true,
    );
    expect(setup.state.players[0]?.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([setup.inst("rest1").instanceId, setup.inst("rest2").instanceId]),
    );
    expect(setup.state.players[0]?.deck).toHaveLength(0);
  });

  it("sets memory to 3 only when it is 2 or less", async () => {
    const setup = setupEngine({ 0: { battleArea: [{ card: "BT21-087", as: "zenith" }] } });
    setup.state.memory = 2;
    await fireTiming(setup, EffectTiming.OnStartTurn);
    expect(setup.state.memory).toBe(3);

    setup.state.memory = 4;
    await fireTiming(setup, EffectTiming.OnStartTurn);
    expect(setup.state.memory).toBe(4);
  });
});
