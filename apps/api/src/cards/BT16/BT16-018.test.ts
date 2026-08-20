import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-018.js";

describe("BT16-018", () => {
  it("prevents battle deletion on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }] });
  });
  it("gains +2000 DP as an inherited your-turn effect", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] }));
});
