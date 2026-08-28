import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST4-02.js";
import "./ST4-05.js";
import "./ST4-07.js";
import "./ST4-09.js";

describe("ST4 vanilla Digimon", () => {
  it.each([
    ["ST4-02", 3, 2, 4000, "Vegetation"],
    ["ST4-05", 3, 4, 5000, "Larva"],
    ["ST4-07", 4, 5, 6000, "Insectoid"],
    ["ST4-09", 5, 6, 7000, "Insectoid"],
  ])("registers %s as complete vanilla IR with catalog stats", (cardId, level, playCost, dp, type) => {
    const definition = getCardDefinition(cardId)!;
    const compiled = getCompiledCard(cardId)!;

    expect(definition.level).toBe(level);
    expect(definition.playCost).toBe(playCost);
    expect(definition.dp).toBe(dp);
    expect(definition.colors).toEqual(["Green"]);
    expect(definition.types).toContain(type);
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(definition.securityEffectText).toBeUndefined();
    expect(compiled.effects).toEqual([]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
