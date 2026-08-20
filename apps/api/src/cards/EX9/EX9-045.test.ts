import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-045.js";

describe("EX9-045", () => {
  it("has Alliance and Blocker", () => {
    const statics = compiled.effects?.filter((entry) => entry.keywords?.length);
    expect(statics?.flatMap((entry) => entry.keywords)).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }]));
  });
  it("plays a WG Digimon costing seven or less from hand on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], target: { filter: { playCostLte: 7 } } }));
  it("returns up to two opponent Digimon to the bottom of the deck during DNA digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "PlayWithoutCost" }, { kind: "Return", target: { count: 2, upTo: true }, to: "deckBottom", condition: { kind: "isDnaDigivolving" } }] }));
});
