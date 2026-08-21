import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-100.js";

describe("BT20-100 The Last Guardian", () => {
  it("reveals Cool Boy and a Royal Knight/X Antibody card, then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, filter: { nameOrTrait: [{ tokens: ["Cool Boy"], match: "name" }] } },
          { count: 1, filter: { nameOrTrait: [{ tokens: ["Royal Knight", "X Antibody"], match: "trait" }] } },
        ],
        rest: "deckBottom",
      }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("uses Delay to prevent one Omnimon leaving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", sourceFilter: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] }, target: { filter: { useTriggerSource: true }, count: 1 }, actions: [] }],
    });
  });
});
