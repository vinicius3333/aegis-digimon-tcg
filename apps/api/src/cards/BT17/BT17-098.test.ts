import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-098.js";

describe("BT17-098 Hacker Pride", () => {
  it("reveals Pulsemon-text cards and places the Option in the battle area", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ to: "hand", count: 1, filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } }] }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("uses Delay to place only the selected Digimon's top card into Security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{
        kind: "GainMemory",
        amount: 2,
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "place",
          destination: "security",
          position: "top",
          target: { count: 1, topCardOnly: true, filter: { levelComparison: { op: "gte", value: 4 }, nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
        },
      }],
    });
  });

  it("preserves the same reveal-and-place sequence in Security", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }] });
  });
});
