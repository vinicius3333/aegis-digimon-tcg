import { describe, expect, it } from "vitest";
import { getCompiledCard, promoProductCardIds } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-065.js";

const st11SpecialEntryPackCardIds = promoProductCardIds("ST11 Special Entry Pack");

describe("ST11 Special Entry Pack collection audit", () => {
  it("maps the committed ST11 product inventory to its sole promo card", () => {
    expect(st11SpecialEntryPackCardIds).toEqual(["P-065"]);
  });

  it("registers every ST11 card exclusively as full compiled IR behavior", () => {
    for (const cardId of st11SpecialEntryPackCardIds) {
      expect(getEffectModule(cardId)).toBeDefined();
      expect(hasRegisteredCompiledCard(cardId)).toBe(true);
      expect(getCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
      expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    }
  });
});
