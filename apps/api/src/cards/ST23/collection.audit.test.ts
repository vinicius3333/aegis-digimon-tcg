import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

const ST23_IDS = Array.from({ length: 15 }, (_, index) => `ST23-${String(index + 1).padStart(2, "0")}`);

describe("ST23 collection coverage", () => {
  it("has catalog definitions and runtime evidence for every card", () => {
    for (const cardId of ST23_IDS) {
      expect(getCardDefinition(cardId)?.set, cardId).toBe("ST23");
      expect(runtimeCompiledCard(cardId), cardId).toBeDefined();
    }
  });
});
