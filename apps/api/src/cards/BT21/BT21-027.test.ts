import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-027.js";

describe("BT21-027 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("requires OmniShoutmon and ZeigGreymon as the two DigiXros materials", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }], count: 2 },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [expect.objectContaining({ keyword: "SecurityAttack", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
          },
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
          },
        ],
      }),
    );
  });
});
