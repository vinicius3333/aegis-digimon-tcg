import { describe, expect, it } from "vitest";
import { getCompiledCard, HAND_AUTHORED_COVERAGE_OVERRIDES } from "./data.js";

describe("hand-authored EX4 coverage overrides", () => {
  it("reports complete runtime coverage for every audited manual override", () => {
    for (const cardId of HAND_AUTHORED_COVERAGE_OVERRIDES) {
      expect(getCompiledCard(cardId), cardId).toMatchObject({ coverage: "full", residual: [] });
    }
  });
});
