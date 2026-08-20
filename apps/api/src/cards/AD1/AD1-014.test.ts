import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../../cards/index.js";

describe("AD1-014 MetalGarurumon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-014");
    const compiled = registeredCompiledCards.get("AD1-014") ?? getCompiledCard("AD1-014");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-014");
    expect(definition?.nameEn).toBe("MetalGarurumon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });
});
