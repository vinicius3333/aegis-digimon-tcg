import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT20-027.js";

describe("BT20-027 Slayerdramon", () => {
  it("registers the compiled card and preserves piercing", () => {
    expect(getEffectModule("BT20-027")).toBeDefined();
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
  });

  it("trashes three cards from an opposing stack and deletes a stackless Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", amount: 3, target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } } },
          { kind: "Delete", target: { filter: { controller: "opponent", digivolutionCards: "none" } } },
        ],
      });
    }
  });

  it("unsuspends an own Dracomon/Examon-text Digimon after the opponent loses security", () => {
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("installs inherited leave prevention paid by suspending this Digimon", () => {
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", affectsAll: true, leaveCause: "otherThanBattle", cost: { kind: "suspend", target: { isSelf: true } } }],
    });
  });
});
