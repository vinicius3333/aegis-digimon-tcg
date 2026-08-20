import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-006.js";

describe("EX9-006", () => {
  it("inherits a once-per-turn Ver.5 digivolution from trash by trashing its bottom face-down digivolution card", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true, cost: { kind: "trash", target: { count: 1 } } }] }));
});
