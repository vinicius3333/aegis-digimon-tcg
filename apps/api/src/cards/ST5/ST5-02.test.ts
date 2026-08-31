import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-02.js";

describe("ST5-02 Jazamon", () => {
  it("registers the catalog vanilla card through complete compiled IR", () => {
    expect(allCards().find((card) => card.cardId === "ST5-02")).toMatchObject({ nameEn: "Jazamon", level: 3 });
    expect(hasRegisteredCompiledCard("ST5-02")).toBe(true);
    expect(runtimeCompiledCard("ST5-02")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
