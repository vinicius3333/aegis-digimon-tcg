import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-078.js";

describe("BT16-078", () => {
  it("deletes an opposing level 4 or lower Digimon on play or digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] });
  });

  it("plays an Undead or Dark Animal level 5 or lower from trash after another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] }] });
  });
});
