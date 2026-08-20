import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-044.js";

describe("EX4-044 Greymon", () => {
  it("may digivolve another own Digimon into a level six or lower Garurumon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], costDelta: -2, optional: true, target: { filter: { controller: "mine", excludeSelf: true } }, into: { filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] } } });
  });
  it("has inherited self-unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ isInherited: true, actions: [{ kind: "Unsuspend" }] });
  });
});
