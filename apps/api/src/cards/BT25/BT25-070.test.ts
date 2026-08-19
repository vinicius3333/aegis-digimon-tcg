import { describe, expect, it } from "vitest";
import { compiled as BT25_070 } from "./BT25-070.js";
import "../index.js";

describe("BT25-070 Offmon", () => {
  it("links a Social, Tool, or Game card from trash or stack, then reacts on self-link", () => {
    const main = BT25_070.effects?.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Link",
      from: ["trash", "digivolutionCards"],
      costDelta: -1,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          hasLinkRequirement: true,
          nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
        },
        count: 1,
      },
    });
    const yourTurn = BT25_070.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      on: { filter: { isSelfRef: true } },
    });
    expect((yourTurn?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
    });
  });
});
