import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-053.js";

describe("BT26-053 Wolvermon", () => {
  it("encodes Blocker and the All Turns Once Per Turn target-switch cost/use route", () => {
    expect(digivolutionRequirementsFor("BT26-053")).toContainEqual({ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true });
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "TrashDigivolution", fromTop: false }, { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }] }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }] });
  });
});
