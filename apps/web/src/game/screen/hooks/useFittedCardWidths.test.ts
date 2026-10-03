import { describe, expect, it } from "vitest";
import { fittedCardWidth } from "./useFittedCardWidths";

describe("fittedCardWidth", () => {
  it("keeps the preferred width when the row is tall enough", () => {
    expect(fittedCardWidth(120, 12, 58)).toBe(58);
  });

  it("shrinks the card until its height and badge room fit the row", () => {
    const width = fittedCardWidth(68, 12, 58);
    expect(width).toBe(40);
    expect(width * 1.4 + 12).toBeLessThanOrEqual(68);
  });

  it("never goes below the smallest readable card", () => {
    expect(fittedCardWidth(20, 12, 58)).toBe(28);
  });
});
