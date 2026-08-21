import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-08 Lalamon", () => {
  it("reduces only DATA SQUAD digivolutions by 1 and inherits +1000 DP", () => {
    const compiled = registeredCompiledCards.get("ST24-08") ?? getCompiledCard("ST24-08")!;
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { isSelfRef: true }, into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] }, actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
