import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-096.js";

describe("BT15-096", () => {
  it("reveals five to add a Machine/Cyborg and trash another, then places itself in battle", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "RevealAdd", revealCount: 5, rest: "deckTop", add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }] }, { kind: "PlaceInBattleAreaSelf" }] });
  });
  it("may play a level 5 or higher Machine/Cyborg from hand with cost reduced by 3 and has the same security reveal", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }] });
  });
});
