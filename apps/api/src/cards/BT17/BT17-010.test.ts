import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-010.js";

describe("BT17-010", () => {
  it("registers the mandatory When Digivolving delete-or-DP effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving" });
  });

  it("registers the inherited DP deletion maximum effect", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "CostModifier", costType: "dpDeletion" }] });
  });
});
