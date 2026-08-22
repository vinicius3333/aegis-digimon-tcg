import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-028.js";

describe("EX4-028 Doumon", () => {
  it("is also treated as Taomon by rule", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Taomon"] });
  });

  it("returns an opposing Digimon at 6000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Return", target: { filter: { dp: { op: "lte", value: 6000 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Return", target: { filter: { dp: { op: "lte", value: 6000 } } } });
  });
  it("reduces one opposing Digimon by 2000 after a sufficiently costly Option", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "ModifyDP", amount: -2000 }] }] });
  });
});
