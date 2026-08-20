import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-062.js";

describe("LM-062 Breathing Training", () => {
  it("compiles the optional Delay digivolution with the printed cost reduction", () => {
    const compiled = runtimeCompiledCard("LM-062")!;
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions).toContainEqual(
      expect.objectContaining({ kind: "Digivolve", reduceCost: 2, payCost: true, optional: true }),
    );
  });

  it("keeps the Security reveal and placement effects marked as Security", () => {
    const compiled = runtimeCompiledCard("LM-062")!;
    const security = compiled.effects.find((effect) => effect.isSecurity);
    expect(security?.actions).toEqual([
      expect.objectContaining({ kind: "RevealAdd", revealCount: 2, rest: "deckBottom" }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
});
