import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-047.js";

describe("EX5-047 Leomon", () => {
  it("may digivolve into a Leomon from hand for one less when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 1, into: { nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] } });
  });
  it("inherits De-Digivolve 1 to one opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } });
  });
});
