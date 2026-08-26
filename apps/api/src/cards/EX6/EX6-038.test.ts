import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-038.js";

describe("EX6-038 Ludomon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon for +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      target: { fromSelectionRef: "placementTarget" },
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 1 },
          { kind: "place", destination: "digivolutionStack", position: "bottom", bindHostAs: "placementTarget", target: { filter: { isSelfRef: true } } },
        ],
      },
    }));
  it("draws once per turn on stack addition and inherits +2000 DP on opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Draw", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });
});
