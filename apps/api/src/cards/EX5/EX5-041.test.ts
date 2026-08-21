import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-041.js";

describe("EX5-041 Ebonwumon", () => {
  it("has Blast Digivolve and suspends opponent Digimon based on own Deva/Four Sovereigns count", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([
      { keyword: "BlastDigivolve" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "scaling" },
      scaling: {
        per: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
        },
        unit: "cards",
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "scaling" },
      scaling: { per: 1, unit: "cards" },
    });
  });
  it("prevents opponent Digimon from unsuspending until their next unsuspend phase and deletes one suspended Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentNextUnsuspendPhase",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
    });
  });
});
