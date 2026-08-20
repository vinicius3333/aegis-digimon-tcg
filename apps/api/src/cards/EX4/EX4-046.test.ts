import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-046.js";

describe("EX4-046 WereGarurumon", () => {
  it("may digivolve another Digimon into a level six or lower Greymon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 2, optional: true, target: { filter: { controller: "mine", excludeSelf: true } }, into: { filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] } } });
  });
  it("can suspend itself to redirect an opponent attack", () => {
    expect(compiled.effects?.find((entry) => (entry.trigger as string) === "WhenOpponentAttacks")).toMatchObject({ isInherited: true, actions: [{ kind: "Suspend", optional: true }, { kind: "RedirectAttack", condition: { kind: "ifThisEffectUsed" } }] });
  });
});
