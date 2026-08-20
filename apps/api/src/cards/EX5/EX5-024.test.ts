import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-024.js";

describe("EX5-024 Azulongmon", () => {
  it("has Blast Digivolve and returns an opposing level five or lower Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([{ keyword: "BlastDigivolve" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } } });
  });
  it("unsuspends one own Deva, Four Great Dragons, or Four Sovereigns", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[1]).toMatchObject({ kind: "Unsuspend", target: { filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Great Dragons", "Four Sovereigns"] }] } } });
  });
});
