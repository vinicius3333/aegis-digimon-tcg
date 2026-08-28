import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-068.js";

describe("BT22-068 Agumon (X Antibody)", () => {
  it("returns a Tyrannomon-named or Dinosaur Digimon from trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Return",
        to: "hand",
        optional: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur"], match: "trait" },
            ],
          },
          count: 1,
        },
      });
    }
  });

  it("anchors inherited memory gain to this Digimon's battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          notSimultaneous: true,
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("returns a Dinosaur from trash through the public play flow", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-068", as: "agumon" }],
          trash: [{ card: "BT8-016", as: "dinosaur" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dinosaurId = s.inst("dinosaur").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === dinosaurId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === dinosaurId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === dinosaurId)).toBe(false);
  });
});
