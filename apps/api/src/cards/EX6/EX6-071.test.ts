import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-071.js";

describe("EX6-071 Pandemonium Lost", () => {
  it("exposes complete IR for the conditional opponent hand cost and level boundary", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "trash", target: { chooser: "opponent" } },
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", value: 5 },
    });
    expect(main?.actions[0]?.target.filter.levelComparison.scaling).toMatchObject({
      levelCeilingAdd: 1,
      unit: "cards",
    });
  });
});
