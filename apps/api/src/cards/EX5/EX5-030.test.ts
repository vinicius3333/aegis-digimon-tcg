import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-030.js";

describe("EX5-030 Liamon", () => {
  it("is also treated as Leomon and may digivolve into a Leomon from hand for one less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Leomon"] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 1, into: { nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] } });
  });
  it("inherits -2000 DP to an opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -2000, duration: "untilOpponentTurnEnd" });
  });
});
