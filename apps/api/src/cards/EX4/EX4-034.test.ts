import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-034.js";

describe("EX4-034 Lopmon", () => {
  it("reveals four and adds a green two-color card plus Shu-Chong Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [
        { filter: { multicolor: true, colorCount: 2, colors: ["Green"] } },
        { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Shu-Chong Wong"] }] } },
      ],
      rest: "deckBottom",
      mandatory: true,
    });
  });
  it("may digivolve itself from hand with a two-cost reduction when suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          actions: [{ kind: "Digivolve", costDelta: -2, from: ["hand"], optional: true }],
        },
      ],
    });
  });

  it("adds both mandatory reveal categories to hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-034", as: "lopmon" }],
          deck: [{ card: "BT10-055", as: "multicolor" }, { card: "EX2-059", as: "shuChong" }, "BT1-090", "ST1-16"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const multicolorId = s.inst("multicolor").instanceId;
    const shuChongId = s.inst("shuChong").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === shuChongId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([multicolorId, shuChongId]),
    );
  });
});
