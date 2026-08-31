import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-181.js";

describe("P-181 Royal Base", () => {
  it("reduces one of your Royal Base digivolutions by 1 during your turn while in Security", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isSecurity: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("adds the top security card to hand, then places this card face up at the bottom", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        { kind: "SecurityManipulation", op: "addBottom", controller: "mine", source: "this" },
      ],
    });
  });

  it("optionally plays a level 5 or lower Royal Base Digimon from hand in Security", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: false,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("executes its Main security exchange through the public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-181", as: "source" }],
          battleArea: [
            { card: "BT1-009" },
            { card: "BT1-037" },
            { card: "BT1-063" },
            { card: "BT1-088" },
            { card: "P-016" },
            { card: "ST6-03" },
            { card: "BT1-084" },
          ],
          security: ["BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-005")).toBe(true);
  });
});
