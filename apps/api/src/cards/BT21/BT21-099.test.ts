import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-099.js";

describe("BT21-099 Xros Up", () => {
  it("places Save from hand/trash under a Tamer and offers Save digivolution from trash", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    const place = main?.actions[0] as any;
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand", "trash"],
      target: { filter: { controller: "mine", kind: ["Digimon"], keywords: ["Save"] } },
      underFilter: { controller: "mine", kind: ["Tamer"] },
      optional: true,
    });
    const digivolve = main?.actions[1] as any;
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      optional: true,
      into: { kind: ["Digimon"], keywords: ["Save"] },
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
      target: { filter: { playCostLte: 5, keywords: ["Save"] } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });
});
