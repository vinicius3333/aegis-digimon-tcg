import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-001.js";

describe("LM-001 Siriusmon", () => {
  it("preserves the hand counter blast-digivolution permission", () => {
    const compiled = runtimeCompiledCard("LM-001")!;
    expect(compiled.effects.filter((effect) => effect.trigger === "Hand" || effect.trigger === "Counter")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })] }),
      ]),
    );
  });

  it.each(["OnPlay", "WhenDigivolving"] as const)("deletes up to 8000 DP and scales by stack colors on %s", (trigger) => {
    const effect = runtimeCompiledCard("LM-001")!.effects.find((candidate) => candidate.trigger === trigger)!;
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "PlaceUnder", optional: true }),
        expect.objectContaining({ kind: "Delete", target: expect.objectContaining({ filter: expect.objectContaining({ dp: { op: "lte", value: 8000 } }) }) }),
        expect.objectContaining({ kind: "CostModifier", amount: 1000, costType: "dpDeletion" }),
      ]),
    );
  });

  it("grants one memory once per turn when another of its Digimon is deleted", () => {
    const effect = runtimeCompiledCard("LM-001")!.effects.find((candidate) => candidate.trigger === "AllTurns")!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions).toContainEqual(expect.objectContaining({ kind: "SubTrigger", event: "onDeletionOf" }));
  });
});
