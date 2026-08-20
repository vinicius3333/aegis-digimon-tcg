import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-042.js";

describe("BT16-042", () => {
  it("grants itself the Insectoid trait", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] });
  });

  it("grants 3000 DP on play or digivolution and inherited suspended DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }] });
  });
});
