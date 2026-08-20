import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-015.js";

describe("EX6-015 Xiangpengmon", () => {
  it("places up to three other blue Digimon under itself and returns opposing low-level Digimon scaled by the placed count", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "PlaceUnder", optional: true, trackCount: "xiangpengmonPlacedCount", target: { count: 3, upTo: true } }, { kind: "Return", to: "hand", target: { count: "all", filter: { levelComparison: { op: "lte", value: 4, scaling: { countSource: "xiangpengmonPlacedCount" } } } } }]);
  });
  it("inherits once-per-turn play from digivolution cards and grants the Aquatic trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] });
  });
});
