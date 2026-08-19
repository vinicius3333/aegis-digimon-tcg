import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-068.js";

describe("BT21-068 Growlmon", () => {
  it("deletes an opposing Digimon and conditionally mills two", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "Delete",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                controller: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 4000 },
              }),
            }),
          }),
          expect.objectContaining({
            kind: "TrashTopDeck",
            amount: 2,
            condition: expect.objectContaining({ kind: "ifThisEffectDidNotDelete" }),
          }),
        ]),
      );
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OnDeletion", isInherited: true }));
  });
});
