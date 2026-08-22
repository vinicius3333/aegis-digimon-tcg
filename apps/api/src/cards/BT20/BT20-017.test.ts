import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-017.js";

describe("BT20-017 Jesmon", () => {
  it("optionally creates the printed token on both entry triggers and once per turn reacts to another Digimon being played", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "PlayToken", tokens: ["Atho, RenxE9 & Por"], count: 1, payCost: false, optional: true }] });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 } }] },
        { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true },
      ],
    });
  });
});
