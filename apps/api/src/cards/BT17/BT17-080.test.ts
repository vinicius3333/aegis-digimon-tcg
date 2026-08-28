import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-080.js";
import "./index.js";

describe("BT17-080 Takato Matsuki", () => {
  it("gains memory for a Guilmon, Growlmon, or Gallantmon Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: { nameOrTrait: [{ tokens: ["Guilmon", "Growlmon", "Gallantmon"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("optionally evolves a Guilmon into Gallantmon for free after placing all three Trash cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] } },
          into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
          additionalCosts: [
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Growlmon"], match: "name" }] } },
            },
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "name" }] } },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains memory at the start of main phase with Guilmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-080", as: "takato" },
          { card: "ST7-03", as: "guilmon" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("takato"));

    expect(s.state.memory).toBe(1);
  });
});
