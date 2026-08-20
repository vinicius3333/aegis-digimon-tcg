import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-095.js";

describe("BT16-095", () => {
  it("suspends two opposing Digimon and bottom-decks all tied lowest-DP suspended Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { count: 2 } });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "Return", to: "deckBottom", target: { count: "all", filter: { suspended: true, superlative: "lowestDP" } } });
  });

  it("gives your Digimon 3000 DP and activates its Main effect from security", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", target: { count: "all" } });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
