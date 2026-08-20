import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-020.js";

describe("EX5-020 Crescemon", () => {
  it("reduces both play and into-this-card digivolution cost by two with a qualifying stacked Digimon", () => {
    const replacements = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions;
    expect(replacements).toMatchObject([{ kind: "Replacement", event: "wouldBePlayed" }, { kind: "Replacement", event: "wouldBeDigivolvedInto", actions: [{ kind: "CostModifier", costType: "digivolve", amount: 2 }] }]);
  });
  it("restricts one opposing Digimon from suspending on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", target: { filter: { controller: "opponent" } } });
  });
});
