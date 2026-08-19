import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-070.js";
describe("BT21-070 Gossipmon", () => {
  it("plays from security and recovers Appmon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", actions: [expect.objectContaining({ kind: "PlayWithoutCost" })] }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
  });
});
