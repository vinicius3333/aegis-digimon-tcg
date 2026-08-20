import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-018.js";

describe("EX8-018", () => {
  it("reveals 3 for a DS card and a Sea Beast/Plesiosaur card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "deckBottom" }));
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }] }));
});
