import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-063.js";

describe("EX9-063", () => {
  it("has Scapegoat and reduces Ver.4 digivolution cost by one per source", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Scapegoat"))?.keywords).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 1 }] }] });
  });
  it("once per turn plays a low-cost DM Digimon from trash by trashing the bottom face-down source", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["trash"], cost: { kind: "trash", target: { filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } } }] }));
  it("inherits Alliance", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Alliance", raw: "＜Alliance＞" }));
});
