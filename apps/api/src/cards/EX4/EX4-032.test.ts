import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-032.js";

describe("EX4-032 Terriermon", () => {
  it("reveals four and adds a green two-color card plus Henry Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [
        { filter: { multicolor: true, colorCount: 2, colors: ["Green"] } },
        { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Henry Wong"] }] } },
      ],
      rest: "deckBottom",
    });
  });
  it("may digivolve itself from hand for two less when Alliance suspends your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              reduceCost: 2,
              optional: true,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("adds both distinct reveal slots to hand through the public play path", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-032", as: "terriermon" }],
          deck: [{ card: "BT10-055", as: "multicolor" }, { card: "EX2-061", as: "henry" }, "BT1-090", "ST1-16"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const multicolorId = s.inst("multicolor").instanceId;
    const henryId = s.inst("henry").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("terriermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === henryId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([multicolorId, henryId]),
    );
  });
});
