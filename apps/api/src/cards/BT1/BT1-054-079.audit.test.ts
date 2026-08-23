import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled as liamon } from "./BT1-054.js";
import { compiled as angemon } from "./BT1-055.js";
import { compiled as tentomon } from "./BT1-066.js";
import { compiled as kokuwamon } from "./BT1-068.js";
import { compiled as ogremon } from "./BT1-069.js";
import { compiled as kuwagamon } from "./BT1-070.js";
import { compiled as kabuterimon } from "./BT1-073.js";
import { compiled as digitamamon } from "./BT1-075.js";
import { compiled as megaKabuterimon } from "./BT1-076.js";
import { compiled as lillymon } from "./BT1-079.js";

describe("BT1 conditional combat IR coverage", () => {
  it("registers complete IR for the migrated conditional cards", () => {
    for (const card of [
      liamon,
      angemon,
      tentomon,
      kokuwamon,
      ogremon,
      kuwagamon,
      kabuterimon,
      digitamamon,
      megaKabuterimon,
      lillymon,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves exact numeric, level, suspension, and keyword gates", () => {
    expect(liamon.effects[0]?.actions[0]).toMatchObject({
      amount: -2000,
      condition: { kind: "memoryAtLeast", value: 3 },
    });
    expect(angemon.effects[0]?.actions[0]).toMatchObject({ amount: -3000 });
    expect(irNode(tentomon.effects[0]?.actions[0])?.target.filter.dp).toEqual({ op: "lte", value: 3000 });
    expect(kokuwamon.effects[0]?.actions[0]?.condition).toMatchObject({ kind: "selfLevelAtLeast", value: 6 });
    expect(ogremon.effects[0]).toMatchObject({ keywords: [{ keyword: "Jamming" }] });
    expect(kabuterimon.effects[0]?.actions[0]?.scaling).toMatchObject({ per: 1, unit: "cards" });
    expect(digitamamon.effects[0]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: -3, at: "endOfTurn" });
    expect(megaKabuterimon.effects[0]?.actions[0]?.condition).toMatchObject({ kind: "permanentCount", value: 2 });
    expect(irNode(lillymon.effects[0]?.actions[0])?.target.filter.excludeKeywords).toContainEqual({
      keyword: "Blocker",
    });
  });
});
