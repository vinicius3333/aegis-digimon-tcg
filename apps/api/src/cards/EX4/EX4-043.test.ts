import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-043.js";

describe("EX4-043 Garurumon", () => {
  it("may digivolve another own Digimon into a level six or lower Greymon from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], optional: true, target: { filter: { controller: "mine", excludeSelf: true } }, into: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] } });
  });
  it("has inherited self-unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ isInherited: true, actions: [{ kind: "Unsuspend" }] });
  });
});
