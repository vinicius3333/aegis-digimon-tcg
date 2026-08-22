import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-068.js";

describe("EX6-068 Descent of the Three Great Angels", () => {
  it("contains security placement, Delay search, and Security permanent IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("placeAsSecurity");
    expect(text).toContain("Three Great Angels");
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(text).toContain("onDeletionOf");
  });
});
