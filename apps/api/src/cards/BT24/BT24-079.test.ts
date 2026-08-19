import { describe, expect, it } from "vitest";
import { compiled as BT24_079 } from "./BT24-079.js";
import "../index.js";

describe("BT24-079 Hadesmon", () => {
  it("links an Appmon card to a separately selected friendly Digimon", () => {
    const main = BT24_079.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(main?.actions?.[1]).toMatchObject({
      kind: "Link",
      target: { filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] }, count: 1 },
      from: ["hand", "digivolutionCards"],
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });
});
