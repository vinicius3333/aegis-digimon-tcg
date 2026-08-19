import { describe, expect, it } from "vitest";
import { compiled as BT25_037 } from "./BT25-037.js";
import "../index.js";

describe("BT25-037 Pegasusmon", () => {
  it("allows zero-security activation and places the specified Digimon or TS Tamer top/bottom", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_037.effects?.find((entry) => entry.trigger === trigger);
      const [toHand, place] = effect?.actions ?? [];
      expect(toHand).toMatchObject({ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 });
      expect(place).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTopOrBottom",
        controller: "mine",
        amount: 1,
        optional: true,
        source: {
          count: 1,
          filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Iliad"], match: "trait" }] },
          orFilters: [{ controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }],
        },
      });
    }
  });
});
