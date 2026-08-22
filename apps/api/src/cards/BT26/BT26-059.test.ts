import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-059.js";

describe("BT26-059 Plutomon", () => {
  it("encodes hand-size cost reduction, shared three-window trash/play, and all-hand-trash lowest-level deletion", () => {
    expect(digivolutionRequirementsFor("BT26-059")).toContainEqual({ level: 5, traits: ["TS"], cost: 4, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 6 }] });
    expect(compiled.effects?.slice(1, 4).map((e) => e.sharedUseKey)).toEqual([
      "bt26-059-trash-play-titan", "bt26-059-trash-play-titan", "bt26-059-trash-play-titan",
    ]);
    expect(compiled.effects?.[1]?.actions).toEqual([
      expect.objectContaining({ kind: "Trash", condition: { kind: "isYourTurn" } }),
      expect.objectContaining({ kind: "PlayWithoutCost", condition: { kind: "isYourTurn" } }),
    ]);
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenHandTrashed", actions: [{ kind: "Delete", target: { count: "all" } }] }] });
  });
});
