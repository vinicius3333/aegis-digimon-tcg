import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-003.js";

describe("EX9-003", () => {
  it("inherits a once-per-turn Ver.3 digivolution cost reduction when it has a face-down digivolution card", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { hasFaceDownDigivolutionCard: true }, actions: [{ mode: "reduceCost", amount: 1 }] }] }));
});
