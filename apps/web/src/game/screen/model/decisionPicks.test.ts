import { describe, expect, it } from "vitest";
import { decisionAllowsPick } from "./decisionPicks";

describe("different-name decision picks", () => {
  const identities = new Map([
    ["medic1", "BT26-028"],
    ["medic2", "BT26-028"],
    ["weather", "BT26-037"],
    ["blanc1", "BT23-076"],
    ["blanc2", "BT6-082"],
  ]);
  function allows(instanceId: string, picks: string[], enabled = true) {
    return decisionAllowsPick({
      instanceId,
      picks,
      decisionSelectable: new Set(identities.keys()),
      decisionInstanceColors: new Map(),
      decisionDifferentColors: false,
      decisionVisibleCardIds: identities,
      decisionDistinctCardIds: false,
      decisionDistinctNames: enabled,
    });
  }
  it("blocks the duplicate Medicmon selected in the VPS Dantemon decision", () => {
    expect(allows("medic2", ["medic1"])).toBe(false);
    expect(allows("weather", ["medic1"])).toBe(true);
    expect(allows("medic1", ["medic1"])).toBe(true); // deselection remains possible
  });
  it("compares names across different card numbers and only when required", () => {
    expect(allows("blanc2", ["blanc1"])).toBe(false);
    expect(allows("blanc2", ["blanc1"], false)).toBe(true);
  });
});
