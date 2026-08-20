import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-005.js";

describe("BT15-005", () => {
  it("draws once when one of your Digimon becomes unsuspended during the opponent's turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
  });
});
