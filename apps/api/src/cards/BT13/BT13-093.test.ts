import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-093.js";

describe("BT13-093 Omekamon", () => {
  it("draws on play and optionally places a Royal Knight from hand under a breeding-area King Drasil", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      from: ["hand"],
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }],
        },
        count: 1,
      },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ match: "name", tokens: ["King Drasil_7D6"] }],
      },
      position: "bottom",
    });
  });
});
