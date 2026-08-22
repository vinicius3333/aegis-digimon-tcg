import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-065.js";
import "../index.js";
describe("BT26-065 Falcomon", () => {
  it("compiles both reveal slots with the purple restriction", () => {
    expect(digivolutionRequirementsFor("BT26-065")).toContainEqual({ level: 2, traits: ["DATA SQUAD"], cost: 0, isAlternate: true });
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1 }, { count: 1 }], rest: "deckBottom" });
  });
  it("keeps the inherited draw then hand-trash sequence", () => {
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw" }, { kind: "Trash", optional: false }] });
  });
});
