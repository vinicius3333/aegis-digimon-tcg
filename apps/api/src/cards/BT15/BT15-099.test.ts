import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-099.js";

describe("BT15-099", () => {
  it("stores the trashed Digimon level for the deletion cap and draws for Myotismon text", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{
        kind: "CostGatedBlock",
        cost: { kind: "trash", storeAs: "trashedDigimonLevel" },
        actions: [
          { kind: "Delete", target: { filter: { levelLte: "trashedDigimonLevel" } } },
          { kind: "Draw", amount: 2, condition: { kind: "lastTrashedMatchesFilter" } },
        ],
      }],
    });
  });
  it("runs the same body from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true }));
});
