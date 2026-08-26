import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-065.js";

const st11SpecialEntryPackCards = allCards().filter((card) => card.cardId === "P-065");

describe("ST11 Special Entry Pack collection audit", () => {
  it("maps the committed ST11 product inventory to its sole promo card", () => {
    expect(st11SpecialEntryPackCards.map((card) => card.cardId)).toEqual(["P-065"]);
  });

  it("registers P-065 exclusively as full compiled IR behavior", () => {
    expect(getEffectModule("P-065")).toBeDefined();
    expect(getCompiledCard("P-065")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("P-065")).toMatchObject({ coverage: "full", residual: [] });
  });
});
