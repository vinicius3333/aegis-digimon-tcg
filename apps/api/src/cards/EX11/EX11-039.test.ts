import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-039.js";

describe("EX11-039 HoverEspimon", () => {
  it("preserves both evolution requirements and the one-Tamer count condition", () => {
    const compiled = runtimeCompiledCard("EX11-039")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, cost: 3, colors: ["Black", "Blue"], isAlternate: true },
      { level: 3, traits: ["Cyborg", "Machine"], cost: 2, isAlternate: true },
    ]);
    const effect = compiled.effects.find((candidate) => candidate.trigger === "WhenDigivolving")!;
    expect(effect.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } } });
    expect(effect.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Altea"], match: "name" }]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Jamming" })] }));
  });
});
