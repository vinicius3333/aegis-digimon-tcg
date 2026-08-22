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

  it("keeps the migrated EX4-069 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-069");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-068 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-068");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-030 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-030");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-021 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-021");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-060 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-060");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-059 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-059");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-062 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-062");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-073 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-073");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-072 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-072");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });

  it("keeps the migrated EX4-051 IR record full and residual-free", () => {
    const compiled = runtimeCompiledCard("EX4-051");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });
});
