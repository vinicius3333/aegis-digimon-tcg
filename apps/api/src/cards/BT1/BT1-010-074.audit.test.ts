import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled as agumon } from "./BT1-010.js";
import { compiled as metalGarurumon } from "./BT1-044.js";
import { compiled as patamon } from "./BT1-048.js";
import { compiled as petermon } from "./BT1-056.js";
import { compiled as magnaAngemon } from "./BT1-060.js";
import { compiled as mistymon } from "./BT1-061.js";
import { compiled as slashAngemon } from "./BT1-062.js";
import { compiled as seraphimon } from "./BT1-063.js";
import { compiled as palmon } from "./BT1-067.js";
import { compiled as woodmon } from "./BT1-072.js";
import { compiled as togemon } from "./BT1-074.js";

describe("BT1 reveal, recovery, and target IR coverage", () => {
  it("registers complete IR for the migrated cards", () => {
    for (const card of [
      agumon,
      metalGarurumon,
      patamon,
      petermon,
      magnaAngemon,
      mistymon,
      slashAngemon,
      seraphimon,
      palmon,
      woodmon,
      togemon,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves reveal counts, destinations, target counts, and inherited clauses", () => {
    expect(agumon.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 5,
      rest: "deckBottomAnyOrder",
    });
    expect(metalGarurumon.effects[0]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
    });
    expect(patamon.effects[0]?.actions[0]).toMatchObject({ revealCount: 4, add: [{ count: "all" }] });
    expect(petermon.effects[0]?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true });
    expect(magnaAngemon.effects[1]?.actions[0]?.scaling).toMatchObject({ per: 3, unit: "security" });
    expect(irNode(mistymon.effects[0]?.actions[0])?.target).toMatchObject({ count: 2 });
    expect(slashAngemon.effects[0]?.actions[0]).toMatchObject({ amount: -8000 });
    expect(seraphimon.effects[1]?.actions[0]?.condition).toMatchObject({ kind: "securityAtLeast", value: 3 });
    expect(palmon.effects[0]?.actions[0]).toMatchObject({ revealCount: 3 });
    expect(woodmon.effects[0]).toMatchObject({ keywords: [{ keyword: "Blocker" }] });
    expect(irNode(togemon.effects[0]?.actions[0])?.add[0]?.filter.levelComparison).toEqual({ op: "gte", value: 5 });
  });
});
