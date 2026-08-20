import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-015.js";

describe("EX4-015 Gaomon", () => {
  it("draws one card for each player on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([{ kind: "Draw", amount: 1, controller: "mine" }, { kind: "Draw", amount: 1, controller: "opponent" }]);
  });
  it("inherits memory gain when an effect adds a card to the opponent's hand", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
