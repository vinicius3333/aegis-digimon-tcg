import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-052.js";

describe("EX8-052", () => {
  it("may play a Device Option from hand or trash when Cyberdramon or X Antibody is in its stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    }));
  it("can de-digivolve by 2 by trashing an Option in the battle area", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 2,
      optional: true,
      cost: { kind: "trash" },
    });
  });
});
