import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-035.js";

describe("BT17-035", () => {
  it("models Barrier", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
  });

  it("may use a Plug-In or yellow option from hand for 2 less on digivolution", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, from: ["hand"], optional: true, orFilters: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"] }] }] });
  });

  it("has the inherited Sakuyamon-gated option effect", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "UseOptionWithoutCost", condition: { kind: "selfHasNameContaining" }, reduceCostBy: 2 }] });
  });
});
