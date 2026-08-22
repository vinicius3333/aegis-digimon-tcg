import { describe, expect, it } from "vitest";
import { allCards } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const EX4_IDS = allCards()
  .filter((card) => /^EX4-\d{3}$/.test(card.cardId))
  .map((card) => card.cardId)
  .sort();

describe("EX4 collection registration evidence", () => {
  it("registers every catalog card", () => {
    expect(EX4_IDS).toHaveLength(74);
    expect(EX4_IDS.filter((cardId) => getEffectModule(cardId) === undefined)).toEqual([]);
  });

  it("keeps the migrated EX4-036 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-036");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-037 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-037");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });
});
