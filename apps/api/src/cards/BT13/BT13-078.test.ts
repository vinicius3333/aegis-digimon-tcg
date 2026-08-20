import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-078.js";

describe("BT13-078 Phascomon", () => {
  it("draws 1 and then trashes 1 card on deletion", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
    ]);
  });

  it("keeps the inherited end-of-opponent-turn effect once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
  });
});
