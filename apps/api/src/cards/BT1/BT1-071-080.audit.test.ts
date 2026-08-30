import { describe, expect, it } from "vitest";
import vegiemon from "./BT1-071.js";
import { compiled as woodmon } from "./BT1-072.js";
import { compiled as kabuterimon } from "./BT1-073.js";
import { compiled as togemon } from "./BT1-074.js";
import { compiled as digitamamon } from "./BT1-075.js";
import { compiled as megaKabuterimon } from "./BT1-076.js";
import { compiled as okuwamon } from "./BT1-077.js";
import { compiled as jagamon } from "./BT1-078.js";
import { compiled as lillymon } from "./BT1-079.js";
import titamon from "./BT1-080.js";

describe("BT1-071 through BT1-080 IR coverage", () => {
  it("registers complete executable coverage for every card in the range", () => {
    for (const card of [
      vegiemon,
      woodmon,
      kabuterimon,
      togemon,
      digitamamon,
      megaKabuterimon,
      okuwamon,
      jagamon,
      lillymon,
      titamon,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves the printed timing, keywords, targets, and numeric boundaries", () => {
    expect(vegiemon.effects).toEqual([]);
    expect(woodmon.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(woodmon.effects[1]?.actions[0]).toMatchObject({ kind: "GainMemory", amount: -2 });
    expect(kabuterimon.effects[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "forTheTurn",
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controller: "opponent", kind: ["Digimon"], suspended: true },
      },
    });
    expect(togemon.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottomAnyOrder",
      add: [{ count: 1, filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } } }],
    });
    expect(digitamamon.effects[0]?.actions).toEqual([
      { kind: "GainMemory", amount: 3 },
      { kind: "GainMemory", amount: -3, at: "endOfTurn" },
    ]);
    expect(megaKabuterimon.effects[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "permanentCount",
        seat: "opponent",
        op: "gte",
        value: 2,
        filter: { kind: ["Digimon"], suspended: true },
      },
    });
    expect(okuwamon.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, controller: "mine", kind: ["Digimon"] },
        },
      ],
    });
    expect(jagamon.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      digivolveOption: {
        into: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"], levels: [6] },
        payCost: false,
        optional: true,
      },
      rest: "deckBottomAnyOrder",
    });
    expect(lillymon.effects[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], excludeKeywords: [{ keyword: "Blocker" }] },
        count: 1,
      },
    });
    expect(titamon.effects).toEqual([]);
  });
});
