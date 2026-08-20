import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-001.js";

describe("EX9-001", () => {
  it("inherits a once-per-turn attack digivolution into a Ver.1 Digimon from hand with cost reduced by 1", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] }));
});
