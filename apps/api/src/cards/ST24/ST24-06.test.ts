import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-06 RizeGreymon", () => {
  it("shares its once-per-turn DP reduction and exact two-card face-down Tamer cost across three triggers", () => {
    const compiled = registeredCompiledCards.get("ST24-06") ?? getCompiledCard("ST24-06")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "ModifyDP", amount: -5000 }, { kind: "PlayWithoutCost", optional: true, cost: { kind: "trash", target: { count: 2, filter: { zone: "digivolutionCards", faceDown: true, position: "bottom", hostFilter: { kind: ["Tamer"] } } } } }] });
    }
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", cost: { kind: "trash", target: { count: 1, filter: { zone: "digivolutionCards", faceDown: true, position: "bottom", hostFilter: { kind: ["Tamer"] } } } } }] });
  });
});
