import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-065.js";

describe("EX6-065 Kokomon", () => {
  it("waives color requirements with Legend-Arms and can place one from trash under a Digimon then play itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "PlaceUnder", target: { from: ["trash"] }, optional: true }, { kind: "PlaceInBattleAreaSelf", optional: true }]);
  });
  it("activates Main from security and revives a Legend-Arms card when one of your Digimon leaves", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]?.kind).toBe("ActivateMain"));
});
