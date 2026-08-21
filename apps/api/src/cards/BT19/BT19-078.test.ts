import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-078.js";

describe("BT19-078 ADR-01 Jeri", () => {
  it("compiles DP scaling, restricted Main relocation, and optional inherited redirect", () => {
    const card = runtimeCompiledCard("BT19-078");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -1000, scaling: { unit: "digivolutionCardsOfFiltered" } });
    expect(card?.effects.find((e) => e.trigger === "Main")?.actions[0]).toMatchObject({ kind: "PlaceUnder", targetIsPermanent: true, underFilter: { excludeCardsNamed: ["ADR-01 Jeri"] } });
    expect(card?.effects.find((e) => e.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }, { kind: "RedirectAttack", optional: true }] });
  });
});
