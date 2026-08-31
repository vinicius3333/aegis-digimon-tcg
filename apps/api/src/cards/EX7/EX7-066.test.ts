import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-066.js";

describe("EX7-066", () => {
  it("gives +3000 DP when this digivolution card is discarded and waives its color requirement with a Three Musketeers Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      requireByEffect: true,
      actions: [{ kind: "ModifyDP", amount: 3000 }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
  });
  it("deletes an opposing Digimon up to 9000 DP and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 9000 } } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));
});
