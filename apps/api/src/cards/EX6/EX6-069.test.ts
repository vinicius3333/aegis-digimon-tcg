import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-069.js";

describe("EX6-069 Rise of the Seven Great Demon Lords", () => {
  it("contains Gate of Deadly Sins placement, Delay revival, and Security permanent IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("Seven Great Demon Lords");
    expect(text).toContain("Gate of Deadly Sins");
    expect(text).toContain("onDeletionOf");
    expect(text).toContain("PlaceInBattleAreaSelf");
  });
});
