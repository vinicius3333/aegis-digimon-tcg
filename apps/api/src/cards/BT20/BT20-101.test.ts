import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-101.js";

describe("BT20-101 Zephagamon", () => {
  it("watches any Digimon suspension and unsuspends once per turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] }, actions: [{ kind: "Unsuspend", target: { isSelf: true }, optional: true }] }],
    });
  });

  it("scales the bottom-deck return by every two suspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Suspend", optional: true }, { kind: "Return", to: "deckBottom", scaling: { per: 2, unit: "cards", filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] } } }],
      });
    }
  });
});
