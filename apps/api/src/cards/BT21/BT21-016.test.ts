import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-016.js";

describe("BT21-016 compiled implementation", () => {
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

  it("preserves Raid, Piercing, optional On Deletion placement followed by Save, and DigiXros", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Hero"], match: "trait" }],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
            abortOnDecline: true,
          }),
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          },
        ],
      }),
    );
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ traits: ["Xros Heart"] }], count: 1 }]);
  });
});
