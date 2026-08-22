import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-057.js";

describe("BT26-057 Bearcatmon", () => {
  it("encodes Digimon-effect immunity, dual All Turns unsuspend triggers, TS waiver, and granted attack", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "TrashDigivolution" }, { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"] }, { kind: "ModifyDP", amount: 3000 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched" }, { kind: "SubTrigger", event: "whenDigivolutionTrashed" }] });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Main", actions: [{ kind: "DeDigivolve", amount: 1 }, { kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" }] });
  });
});
