import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-068.js";

describe("BT14-068", () => {
  it("deletes opposing Digimon up to seven play cost on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "DeleteBudget",
      budget: 7,
      upTo: true,
    }));
  it("gives all own D-Brigade Digimon Blocker during the opponent's turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
    }));
  it("once per turn reveals three to play D-Brigade or DigiPolice cards up to seven total cost", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ count: "all", costBudget: 7, to: "play" }] }],
    }));
});
