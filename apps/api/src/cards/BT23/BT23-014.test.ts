import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-014.js";

describe("BT23-014 Gallantmon", () => {
  it("installs floodgate and deletion effects on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "RestrictPlay",
        seat: "opponent",
        filter: { kind: ["Digimon", "Tamer"], zone: "trash" },
        byEffectOnly: true,
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 8000 } } },
        dpCeilingScaling: { amount: 2000, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
    }
  });

  it("installs only the deletion effect when attacking", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")!;
    expect(effect.actions).toHaveLength(1);
    expect(effect.actions[0]).toMatchObject({ kind: "Delete", dpCeilingScaling: { amount: 2000 } });
  });
});
