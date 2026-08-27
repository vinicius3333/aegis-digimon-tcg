import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-084.js";

describe("BT16-084", () => {
  it("plays Hawkmon or Salamon and returns itself at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
        { kind: "SubTrigger", event: "endOfOpponentTurn", actions: [{ kind: "Return", to: "hand" }] },
      ],
    });
  });

  it("gains memory by suspending itself when a red or yellow Digimon digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "ModifyDP",
              amount: -3000,
              condition: { kind: "allOf", conditions: [{ kind: "isDnaDigivolving" }, { kind: "ifThisEffectActed" }] },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
