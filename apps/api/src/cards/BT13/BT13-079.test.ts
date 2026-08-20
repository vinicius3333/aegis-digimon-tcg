import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-079.js";

describe("BT13-079 Falcomon", () => {
  it("grants Retaliation to one purple Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 },
      keyword: { keyword: "Retaliation" },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("lets the opponent trash a card when this card is deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });
});
