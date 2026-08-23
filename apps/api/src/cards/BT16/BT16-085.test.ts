import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT16-085.js";

describe("BT16-085", () => {
  it("plays Veemon or Wormmon and returns itself at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
        { kind: "SubTrigger", event: "endOfOpponentTurn", actions: [{ kind: "Return", to: "hand" }] },
      ],
    });
  });

  it("gains memory and may trash three opposing digivolution cards during DNA digivolution", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "TrashDigivolution",
              amount: 3,
              condition: { kind: "allOf", conditions: [{ kind: "isDnaDigivolving" }, { kind: "ifThisEffectActed" }] },
            },
          ],
        },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("optional");
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("abortOnDecline");
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
