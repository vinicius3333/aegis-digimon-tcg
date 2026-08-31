import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-05.js";

describe("ST5-05 Commandramon", () => {
  it("registers the catalog vanilla card through complete compiled IR", () => {
    expect(allCards().find((card) => card.cardId === "ST5-05")).toMatchObject({ nameEn: "Commandramon", level: 3 });
    expect(hasRegisteredCompiledCard("ST5-05")).toBe(true);
    expect(runtimeCompiledCard("ST5-05")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
