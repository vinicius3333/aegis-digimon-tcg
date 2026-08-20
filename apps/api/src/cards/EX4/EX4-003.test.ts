import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-003.js";

describe("EX4-003 Tsunomon", () => {
  it("draws once per turn when another one of your Digimon digivolves", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] }, actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
  });
});
