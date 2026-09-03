import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled as garudamon } from "./BT1-022.js";
import { compiled as skullGreymon } from "./BT1-023.js";
import { compiled as breakdramon } from "./BT1-026.js";
import { compiled as dolphmon } from "./BT1-033.js";
import { compiled as ikkakumon } from "./BT1-034.js";
import { compiled as cerberusmon } from "./BT1-039.js";
import { compiled as zudomon } from "./BT1-041.js";
import { compiled as saberLeomon } from "./BT1-043.js";

describe("BT1 combat and evolution IR coverage", () => {
  it("registers complete executable coverage", () => {
    for (const card of [garudamon, skullGreymon, breakdramon, dolphmon, ikkakumon, cerberusmon, zudomon, saberLeomon]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed keywords, timing, costs, and source boundaries", () => {
    expect(garudamon.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      { trigger: "WhenBlocked", isInherited: true },
    ]);
    expect(irNode(skullGreymon.effects[0]?.actions[0])?.target.filter.keywords).toContain("Blocker");
    expect(breakdramon.effects[0]?.keywords).toContainEqual({ keyword: "Piercing", raw: "＜Piercing＞" });
    expect(dolphmon.effects[0]?.actions[0]).toMatchObject({
      amount: 1000,
      condition: { kind: "opponentHas", countMin: 1 },
    });
    expect(ikkakumon.effects[0]?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "cantBeBlockedByNoDigivolution",
    });
    expect(cerberusmon.effects[0]).toMatchObject({ frequency: "TwicePerTurn", optional: true });
    expect(irNode(cerberusmon.effects[0]?.actions[0]?.cost).target).toMatchObject({ count: 3 });
    expect(zudomon.effects[0]?.actions[0]).toMatchObject({ kind: "Draw", amount: 2 });
    expect(saberLeomon.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 4, fromTop: false });
  });
});
