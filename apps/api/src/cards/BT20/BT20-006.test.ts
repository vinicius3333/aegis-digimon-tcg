import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-006.js";

describe("BT20-006 DemiMeramon", () => {
  it("proves optional On Deletion recovery targets one of your Ghost Digimon in trash", () => {
    const action = compiled.effects.find((entry) => entry.isInherited)?.actions[0];
    expect(action).toMatchObject({
      kind: "Return",
      optional: true,
      to: "hand",
      target: {
        count: 1,
        filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
      },
    });
  });
});
