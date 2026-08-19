import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-064.js";

describe("BT23-064 Bakemon", () => {
  it("requires deleting one of your Digimon to delete one opposing level 4 or lower Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
        cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("gains 1 memory as an inherited On Deletion effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any;
    expect(effect).toMatchObject({ isInherited: true, actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
