import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-009.js";

describe("BT22-009 Effecmon", () => {
  it("plays from Security only at end of battle and deletes 4000-DP-or-less Digimon on entry", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, timing: "endOfBattle" });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, isSelf: true },
      payCost: false,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      });
    }
  });
});
