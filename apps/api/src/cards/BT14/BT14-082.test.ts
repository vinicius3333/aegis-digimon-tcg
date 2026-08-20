import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-082.js";

describe("BT14-082", () => {
  it("gives a Vaccine Digimon +2000 DP at the start of main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, target: { filter: { nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } } }));
  it("plays itself from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
});
