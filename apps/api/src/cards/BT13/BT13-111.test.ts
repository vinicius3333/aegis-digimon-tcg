import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-111.js";

describe("BT13-111 Gallantmon", () => {
  it("reduces play cost by two for every five cards in both trash when no Digimon is present", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0];
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", scaling: { per: 5, unit: "cards", filter: { controllerDefault: "both", zone: "trash" } } });
    expect((replacement as { actions?: unknown[] }).actions?.[0]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 2, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] } } });
  });

  it("has Rush and the fallback delete when no level 6-or-lower target was deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "permanent" });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 } });
      expect(actions[1]).toMatchObject({ kind: "Delete", condition: { kind: "ifThisEffectDidNotDelete" }, target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 13000 } }, count: 1 } });
    }
  });
});
