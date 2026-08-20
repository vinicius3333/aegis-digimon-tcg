import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-025.js";

describe("EX7-025 Arisa Kinosaki", () => {
  it("plays Arisa from hand on digivolving when you have one or fewer Tamers", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHave" } }));
  it("inherits permanent -3000 DP to all opposing Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { count: "all" } }));
});
