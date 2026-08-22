import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-013.js";

describe("BT17-013", () => {
  it("deletes an opposing Digimon at 6000 DP or less and grants Security Attack +1 if it did not delete", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn", condition: { kind: "ifThisEffectDidNotDelete" } });
  });

  it("unsuspends once per turn when an opposing Digimon is deleted", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Unsuspend", optional: true, condition: { kind: "selfHasNameContaining", names: ["Gallantmon"] } }] }] });
  });
});
