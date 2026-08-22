import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
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
    expect(start?.actions[0]).toMatchObject({
      cost: {
        target: {
          filter: { keywords: ["Save"] },
          orFilters: [{ nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] }],
        },
        underFilter: { controller: "mine", kind: ["Tamer"] },
      },
    });
    expect(start?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { kind: ["Digimon"] },
      into: {
        kind: ["Digimon"],
        keywords: ["Save"],
        orFilters: [{ nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] }],
      },
    });
    const reduction = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0];
    expect(reduction).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 1,
      cost: { kind: "suspend" },
      additionalCosts: [{ kind: "place", destination: "digivolutionStack", position: "bottom", host: "triggerSource" }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places a Save Digimon under itself and gains memory at start of main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT21-088", as: "tagiru" }], hand: [{ card: "BT21-063", as: "saveDigimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tagiru"));
    await settle(() => s.perm("tagiru").stack.some((card) => card.cardId === "BT21-063"));

    expect(s.perm("tagiru").stack.map((card) => card.cardId)).toContain("BT21-063");
    expect(s.state.memory).toBe(4);
  });
});
