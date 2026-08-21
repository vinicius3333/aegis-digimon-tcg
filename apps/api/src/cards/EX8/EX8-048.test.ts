import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-048.js";

describe("EX8-048", () => {
  it("plays Close from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "youHave" },
    }));
});
