import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-008.js";

describe("BT17-008", () => {
  it("registers the Calumon/Takato enter-field reaction and inherited DP threshold effect", () => {
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]).toMatchObject({
      actions: [{ sourceFilter: { kind: ["Digimon"], orFilters: [{ kind: ["Tamer"] }] } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "CostModifier", costType: "dpDeletion" }],
    });
  });
});
