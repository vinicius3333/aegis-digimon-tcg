import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-07.js";

describe("ST5-07 Jazardmon", () => {
  it("registers the catalog vanilla card through complete compiled IR", () => {
    expect(allCards().find((card) => card.cardId === "ST5-07")).toMatchObject({ nameEn: "Jazardmon", level: 4 });
    expect(hasRegisteredCompiledCard("ST5-07")).toBe(true);
    expect(runtimeCompiledCard("ST5-07")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
