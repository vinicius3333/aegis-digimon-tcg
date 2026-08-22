import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-027.js";

describe("EX4-027 GoldVeedramon", () => {
  it("has Armor Purge", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({ keyword: "Armor Purge" });
  });

  it("reduces one opposing Digimon then restricts one at 6000 DP or less", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -2000 });
    expect(actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd", target: { filter: { dp: { op: "lte", value: 6000 } } } });
  });
  it("gates the restriction on a blue/yellow Tamer or Armor Form trash card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({ condition: { kind: "or", conditions: [{ kind: "youHave", filter: { colors: ["Blue", "Yellow"] } }, { kind: "youHave", filter: { nameOrTrait: [{ match: "trait", tokens: ["Armor Form"] }] } }] } });
  });
});
