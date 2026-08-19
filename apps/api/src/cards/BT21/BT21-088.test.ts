import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-088.js";

describe("BT21-088 Tagiru Akashi", () => {
  it("draws after the Save/Hero hand placement and pays the digivolution reduction with both costs", () => {
    const start = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(start?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place" },
    });
    expect(
      (start?.actions[0] as { cost?: { target?: { filter?: { keywords?: string[]; nameOrTrait?: unknown } } } })?.cost
        ?.target?.filter,
    ).toMatchObject({ keywords: ["Save"], nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] });
    expect(start?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { kind: ["Digimon"] },
      into: { kind: ["Digimon"], keywords: ["Save"] },
    });
    const reduction = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0];
    expect(reduction).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 1, cost: { kind: "suspend" } });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
