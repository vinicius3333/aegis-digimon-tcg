import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-034.js";

describe("BT14-034", () => {
  it("plays itself from security without paying", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("inherits -3000 DP to an opposing Digimon on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }] }));
});
