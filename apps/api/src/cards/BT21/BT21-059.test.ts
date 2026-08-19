import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-059.js";

describe("BT21-059 Timemon", () => {
  it("de-digivolves one opponent Digimon once per turn when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenLinked",
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
          },
        ],
      },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Watchmon", "Savemon", "Calendamon"], cost: 0 }]);
  });
});
