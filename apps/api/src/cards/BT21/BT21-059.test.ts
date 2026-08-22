import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-059.js";

describe("BT21-059 Timemon", () => {
  it("preserves Blocker, App Fusion, and Appmon Link requirements", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Watchmon", "Savemon", "Calendamon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
  });

  it("de-digivolves one opponent Digimon once per turn when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenLinked",
        sourceFilter: { isSelfRef: true },
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

  it("de-digivolves one opposing Digimon when this linked card links", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
          },
        ],
      }),
    );
  });
});
