import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-009.js";

describe("LM-009 Airdramon", () => {
  it("reduces both play and digivolution costs by suspending itself for Angoramon-text Digimon", () => {
    const actions = runtimeCompiledCard("LM-009")!.effects.flatMap((entry) => entry.actions);
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Replacement", event: "wouldBePlayed" }),
      expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" }),
    ]));
  });
});
