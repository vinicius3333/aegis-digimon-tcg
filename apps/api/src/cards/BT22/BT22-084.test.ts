import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-084.js";

describe("BT22-084 Nokia Shiramine", () => {
  it("limits both Agumon/Gabumon plays to one or fewer own Digimon", () => {
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        target: {
          filter: { controller: "mine", nameOrTrait: [{ tokens: ["Agumon", "Gabumon"], match: "name" }] },
          count: 1,
        },
        condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Digimon"] }, op: "lte", value: 1 },
      });
    }
  });

  it("sets memory, buffs named Digimon, and plays itself from security", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { count: "all" },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });
});
