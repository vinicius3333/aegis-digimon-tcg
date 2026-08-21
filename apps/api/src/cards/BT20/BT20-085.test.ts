import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-085.js";

describe("BT20-085 Shoto Kazama", () => {
  it("models the Start of Main Phase bottom-deck cost and gated follow-up", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          cost: { kind: "return", position: "bottom", target: { isSelf: true } },
        },
        {
          kind: "PlayWithoutCost",
          condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "youHaveNone" }] },
          target: { filter: { levels: [3] } },
          from: ["trash"],
        },
      ],
    });
  });

  it("gates the Vortex Warriors DP effect on the suspend cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      actions: [
        { kind: "Suspend", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "ModifyDP", condition: { kind: "ifThisEffectActed" }, amount: 2000, duration: "untilOpponentTurnEnd" },
      ],
    });
  });
});
