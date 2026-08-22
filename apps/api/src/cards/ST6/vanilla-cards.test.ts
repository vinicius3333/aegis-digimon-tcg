import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

describe("ST6 vanilla cards", () => {
  it("registers every catalog vanilla card through compiled IR", () => {
    for (const cardId of ["ST6-02", "ST6-05", "ST6-07", "ST6-09"]) {
      expect(hasRegisteredCompiledCard(cardId)).toBe(true);
    }
  });
});
