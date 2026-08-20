import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-013.js";

describe("EX5-013 Zhuqiaomon", () => {
  it("supports Blast Digivolve and shared once-per-turn deletion for Security Attack plus one", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([{ keyword: "BlastDigivolve" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, cost: { kind: "deleteOwn", target: { filter: { orFilters: [{ nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] }, { dp: { op: "lte", value: 6000 } }] } } } });
  });
  it("deletes the highest-DP opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", superlative: "highestDP" } } });
  });
});
