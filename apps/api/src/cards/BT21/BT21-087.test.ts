import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-087.js";
import "../index.js";

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

    await advance(setup.engine).fire(EffectTiming.OnPlay, setup.perm("zenith"));

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
    await advance(setup.engine).fire(EffectTiming.OnStartTurn, setup.perm("zenith"));
    expect(setup.state.memory).toBe(3);

    setup.state.memory = 4;
    await advance(setup.engine).fire(EffectTiming.OnStartTurn, setup.perm("zenith"));
    expect(setup.state.memory).toBe(4);
  });

  it("trashes all three revealed cards when none contain Vemmon in their text", async () => {
    const setup = setupEngine({
      0: {
        battleArea: [{ card: "BT21-087", as: "zenith" }],
        deck: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
          { card: "BT1-011", as: "third" },
        ],
      },
    });
    await setup.ready();

    await advance(setup.engine).fire(EffectTiming.OnPlay, setup.perm("zenith"));
    expect(setup.state.players[0]!.hand).toHaveLength(0);
    expect(setup.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        setup.inst("first").instanceId,
        setup.inst("second").instanceId,
        setup.inst("third").instanceId,
      ]),
    );
  });

  it("plays itself from Security without paying cost and resolves its On Play reveal", async () => {
    const setup = setupEngine(
      {
        0: {
          security: [{ card: "BT21-087", as: "zenith" }],
          deck: [{ card: "BT11-065", as: "vemmonText" }, "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    setup.state.memory = 0;
    await setup.ready();

    await advance(setup.engine).fireForInstance(EffectTiming.SecuritySkill, setup.inst("zenith"));
    await settle(() => setup.state.players[0]!.battleArea.length === 1);
    expect(setup.state.memory).toBe(0);
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("vemmonText").instanceId)).toBe(
      true,
    );
  });
});
