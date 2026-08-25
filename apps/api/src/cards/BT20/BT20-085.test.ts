import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-085.js";

describe("BT20-085 Shoto Kazama", () => {
  it("models the Start of Main Phase bottom-deck cost and gated follow-up", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      cost: { kind: "return", position: "bottom", target: { isSelf: true } },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "youHaveNone" }] },
      target: { filter: { levels: [3], nameOrTrait: [{ match: "trait", tokens: ["Avian", "Bird"] }] } },
      from: ["trash"],
    });
    expect(effect?.actions).toHaveLength(2);
  });

  it("gates the Vortex Warriors DP effect on the suspend cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      actions: [
        { kind: "Suspend", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("registers exactly one security play effect", () => {
    const security = compiled.effects.filter((entry) => entry.trigger === "Security");
    expect(security).toHaveLength(1);
    expect(security[0]).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
