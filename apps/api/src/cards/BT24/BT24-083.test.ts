import { describe, expect, it } from "vitest";
import { compiled as BT24_083 } from "./BT24-083.js";
import "../index.js";

describe("BT24-083 Hiroko Sagisaka", () => {
  it("returns itself to deck bottom and offers Hiroko or a qualifying TS Digimon", () => {
    const start = BT24_083.effects?.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Hiroko Sagisaka"], match: "name" }] },
        orFilters: [
          { kind: ["Digimon"], dp: { op: "lte", value: 5000 }, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
        ],
      },
      cost: { kind: "return", to: "deckBottom" },
    });
    expect(BT24_083.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
    });
  });
});
