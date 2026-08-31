import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-042.js";

describe("EX6-042 RaijiLudomon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to grant the opponent an attack aura", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 2 },
          {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { isSelfRef: true } },
          },
        ],
      },
    }));
  it("grants Blocker/Reboot on stack addition and inherits deletion prevention", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              optional: true,
              cost: { target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } } } },
            },
          ],
        },
      ],
    });
  });
});
