import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-051.js";

describe("BT21-051 Puppetmon", () => {
  it("models Blast Digivolve, Reboot, Blocker, and the shared On Play/When Digivolving sequence", () => {
    expect(compiled.effects.filter((effect) => effect.keywords?.length).map((effect) => effect.keywords?.[0]?.keyword)).toEqual([
      "BlastDigivolve",
      "Reboot",
      "Blocker",
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 2 },
        { kind: "Return", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 }, to: "deckBottom" },
      ]);
    }
  });

  it("keeps the alternate WG level-5 evolution requirement at cost 3", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["WG"], cost: 3, isAlternate: true }]);
  });
});
