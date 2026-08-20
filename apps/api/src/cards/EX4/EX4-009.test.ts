import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-009.js";

describe("EX4-009 RizeGreymon", () => {
  it("reduces one opponent Digimon and all opponent security Digimon by 4000 on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual([
      expect.objectContaining({ kind: "ModifyDP", amount: -4000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }),
      expect.objectContaining({ kind: "ModifySecurityDP", controller: "opponent", amount: -4000, duration: "forTheTurn" }),
    ]);
  });
  it("inherits the same pair after a red or yellow Tamer is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] } }] });
  });
});
