import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-019.js";

describe("BT22-019 Veemon", () => {
  it("reduces Veedramon digivolution cost on your turn and only prevents opponent-effect removal", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Prevent", mode: "leavePlay", optional: true, abortOnDecline: true }],
    });
  });
});
