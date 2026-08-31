import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-10.js";

describe("ST5-10 MetalTyrannomon", () => {
  it("registers the catalog vanilla card through complete compiled IR", () => {
    expect(allCards().find((card) => card.cardId === "ST5-10")).toMatchObject({ nameEn: "MetalTyrannomon", level: 5 });
    expect(hasRegisteredCompiledCard("ST5-10")).toBe(true);
    expect(runtimeCompiledCard("ST5-10")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
