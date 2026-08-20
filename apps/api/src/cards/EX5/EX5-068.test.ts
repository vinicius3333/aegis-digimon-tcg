import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-068.js";

describe("EX5-068 BanchoLeomon", () => {
  it("waives color requirements with Leomon/Bancho present and suspends then weakens an opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "ModifyDP", amount: -12000, duration: "forTheTurn" }, { kind: "Attack", optional: true }]);
  });
  it("has the same suspend and DP reduction in security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "ModifyDP", amount: -12000 }]));
});
