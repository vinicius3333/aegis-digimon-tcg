import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-062.js";

describe("BT20-062 Candlemon", () => {
  it("has Retaliation as its main keyword", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
  });

  it("inherits an optional hand-trash cost to delete one opposing level 4 or lower Digimon", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }] });
  });
});
