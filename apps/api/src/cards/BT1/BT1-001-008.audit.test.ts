import { describe, expect, it } from "vitest";
import { compiled as yokomon } from "./BT1-001.js";
import { compiled as bebydomon } from "./BT1-002.js";
import { compiled as upamon } from "./BT1-003.js";
import { compiled as wanyamon } from "./BT1-004.js";
import { compiled as kyaromon } from "./BT1-005.js";
import { compiled as cupimon } from "./BT1-006.js";
import { compiled as tanemon } from "./BT1-007.js";
import { compiled as frimon } from "./BT1-008.js";

describe("BT1-001 through BT1-008 IR coverage", () => {
  it("registers every Digi-Egg with full executable coverage", () => {
    for (const card of [yokomon, bebydomon, upamon, wanyamon, kyaromon, cupimon, tanemon, frimon]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves inherited timing, once-per-turn identity, and exact gates", () => {
    expect(yokomon.effects[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true });
    expect(upamon.effects[0]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(bebydomon.effects[0]?.actions[0]).toMatchObject({
      amount: 2000,
      condition: { kind: "selfHasKeyword", keyword: "Piercing" },
    });
    expect(wanyamon.effects[0]?.actions[0]?.condition).toMatchObject({ kind: "opponentHas", countMin: 2 });
    expect(kyaromon.effects[0]?.actions[0]?.condition).toMatchObject({
      kind: "zoneCount",
      zone: "security",
      op: "gte",
      value: 6,
    });
    expect(cupimon.effects[0]?.actions[0]?.condition).toMatchObject({
      kind: "zoneCount",
      zone: "security",
      op: "gte",
      value: 5,
    });
    expect(tanemon.effects[0]?.actions[0]?.condition).toMatchObject({ kind: "youDigivolvedThisTurn" });
    expect(frimon.effects[0]?.actions[0]?.condition).toMatchObject({
      kind: "opponentHas",
      countMin: 2,
      filter: { zone: "battleArea", suspended: true },
    });
  });
});
