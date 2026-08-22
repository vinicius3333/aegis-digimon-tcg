import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-035.js";

describe("BT17-035 Taomon", () => {
  it("may use a Plug-In or yellow Option from hand at 2 less on digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "UseOptionWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true, filter: { controller: "mine", kind: ["Option"] }, orFilters: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"] }] });
  });

  it("once per turn inherits the same use only when this Digimon has Sakuyamon in its name", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }] });
    expect(effect!.actions[0]).toMatchObject({ condition: { kind: "selfHasNameContaining", names: ["Sakuyamon"] } });
  });
});
