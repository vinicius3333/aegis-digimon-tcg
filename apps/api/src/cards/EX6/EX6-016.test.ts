import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-016.js";

describe("EX6-016 Salamon", () => {
  it("gains memory at the start of the main phase if you have a purple Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "youHave", filter: { colors: ["Purple"], kind: ["Digimon", "Tamer"] } },
    });
  });
  it("inherits once-per-turn -2000 DP when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });
});
