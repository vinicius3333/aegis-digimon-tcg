import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-071.js";

describe("EX7-071", () => {
  it("gains 1 memory when this digivolution card is discarded and waives color with a Three Musketeers Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions).toMatchObject([{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "GainMemory", amount: 1 }] }, { kind: "WaiveColorRequirement", condition: { kind: "youHave" } }]));
  it("deletes opposing level 3, 4, and 5 Digimon and then places itself under a Three Musketeers Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions).toHaveLength(4);
    expect(actions.slice(0, 3).map((action) => action.kind)).toEqual(["Delete", "Delete", "Delete"]);
    expect(actions[3]).toMatchObject({ kind: "PlaceUnder" });
  });
});
