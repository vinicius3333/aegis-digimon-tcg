import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-044.js";

describe("BT20-044 Breakdramon", () => {
  it("suspends two opposing Digimon or Tamers and offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 }, }, { kind: "Attack", optional: true }] });
    }
  });

  it("deletes a suspended opposing Digimon or Tamer after a qualifying own Digimon deletes in battle", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "AllTurns")) {
      expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { controller: "mine", kind: ["Digimon"], textContains: ["[Dracomon]", "[Examon]"] }, fireCondition: { kind: "triggerSourceNotDeletedAtSameTiming" }, actions: [{ kind: "Delete", target: { filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon", "Tamer"] }, count: 1 } }] }] });
    }
    expect(compiled.effects.filter((entry) => entry.isInherited)).toHaveLength(1);
  });
});
