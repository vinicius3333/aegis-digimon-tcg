import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-064.js";

describe("BT17-064 Pipismon", () => {
  it("trashes the bottom two digivolution cards of one opposing Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: false, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });

  it("deletes the combat target only when both Digimon have no digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { isSelfRef: true },
      condition: { kind: "targetHasNone", filter: { digivolutionCards: "hasAny" } },
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", digivolutionCards: "hasNone" }, isCombatTarget: true, count: 1 } }],
    });
  });
});
