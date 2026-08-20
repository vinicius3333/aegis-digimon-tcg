import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-039.js";

describe("BT15-039", () => {
  it("gives one opposing Digimon -3000 DP and makes it lose 1 memory on deletion", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "GainTriggeredEffect", gainedTrigger: "OnDeletion", gainedActions: [{ kind: "GainMemory", amount: -1 }], target: { sameTarget: true } });
  });
  it("grants Gammamon-related effects on all turns and inherited all turns", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: "effects" }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "GrantStatic", grant: "effects" }] });
  });
});
