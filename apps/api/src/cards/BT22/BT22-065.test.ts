import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-065.js";

type EngineInternals = {
  primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> };
};

describe("BT22-065 PlatinumNumemon", () => {
  it("reduces one opposing Digimon by 8000 DP on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -8000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("once per turn evolves another own CS Digimon from hand after an opponent deletion", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          notSimultaneous: true,
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
                count: 1,
              },
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            },
          ],
        },
      ],
    });
  });

  it("deletes by DP and freely evolves another CS Digimon through public play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-054", as: "cs-base" }],
          hand: [
            { card: "BT22-065", as: "platinum" },
            { card: "BT22-056", as: "cs-evolution" },
          ],
        },
        1: { battleArea: [{ card: "BT22-074", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("platinum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("cs-base").topCard?.cardId === "BT22-056");
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("cs-base").topCard?.cardId).toBe("BT22-056");
    expect(s.state.memory).toBe(0);
  });

  it("does not evolve when PlatinumNumemon is deleted in the same batch as the opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-065", as: "platinum" },
            { card: "BT22-054", as: "cs-base" },
          ],
          hand: [{ card: "BT22-056", as: "cs-evolution" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await (s.engine as unknown as EngineInternals).primitives.deletePermanent(
      [s.perm("platinum").permanentId, s.perm("opponent").permanentId],
      "byEffect",
    );
    await settle();

    expect(s.perm("cs-base").topCard?.cardId).toBe("BT22-054");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-056")).toBe(true);
  });
});
