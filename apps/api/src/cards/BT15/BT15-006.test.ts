import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-006.js";

describe("BT15-006", () => {
  it("draws two after trashing a level 5 or higher Digimon from hand", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, optional: true, cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", levelComparison: { op: "gte", value: 5 } } } } });
  });
});
