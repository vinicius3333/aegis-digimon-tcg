import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-002.js";

describe("EX7-002 Terriermon", () => {
  it("inherits once-per-turn draw when attacking if the opponent has no stacked Digimon", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, condition: { kind: "opponentHasNone" } }] }));
});
