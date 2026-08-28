import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-055.js";

describe("EX7-055", () => {
  it("plays Yuuki from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: {
        kind: "zoneCount",
        filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
});
