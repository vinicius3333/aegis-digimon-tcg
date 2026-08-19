import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-069.js";

describe("BT21-069 GulusGammamon", () => {
  it("uses a Gammamon bottom-stack cost to delete a level 4 or lower Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      }),
    );
  });
});
