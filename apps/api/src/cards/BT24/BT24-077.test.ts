import { describe, expect, it } from "vitest";
import { compiled as BT24_077 } from "./BT24-077.js";
import "../index.js";

describe("BT24-077 Revivemon", () => {
  it("links level 4 or lower cards from trash/stack and revives an Appmon on deletion", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      const action = BT24_077.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        recipient: { filter: { controller: "mine", kind: ["Digimon"] } },
        payCost: false,
      });
      expect(action?.target?.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 } });
    }
    const revival = BT24_077.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(
      BT24_077.effects?.find(
        (entry) => entry.trigger === "OnDeletion" && entry.actions?.[0]?.kind === "PlayWithoutCost",
      )?.actions?.[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: {
        filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });
    expect(revival?.kind).toBe("Link");
  });
});
