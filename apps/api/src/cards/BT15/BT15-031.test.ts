import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-031.js";

describe("BT15-031", () => {
  it("returns an opposing level 5 or lower Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Return", to: "hand", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Return", to: "hand" }] });
  });
  it("deletes itself at the opponent's end step to play a non-MetalSeadramon Dark Masters", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfOpponentsTurn", actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }] }));
});
