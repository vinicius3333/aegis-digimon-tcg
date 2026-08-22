import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-043.js";

describe("BT19-043 Lucemon (X Antibody)", () => {
  it("compiles atomic two-security leave prevention and conditional recovery", () => {
    const card = runtimeCompiledCard("BT19-043");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", mode: "prevent", cost: { kind: "trashBothSecurityTop" }, condition: { kind: "selfDigivolutionStackMatchesFilter" } });
    const end = card?.effects.find((e) => e.trigger === "EndOfYourTurn")?.actions ?? [];
    expect(end[0]).toMatchObject({ kind: "SecurityManipulation", optionalFor: "opponent", bindResultAs: "opponentSecurityTrashed" });
    expect(end[1]).toMatchObject({ kind: "Recover", condition: { kind: "bindingEmpty" } });
  });
});
