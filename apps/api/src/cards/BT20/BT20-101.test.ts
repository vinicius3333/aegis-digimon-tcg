import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-101.js";
import "./index.js";

describe("BT20-101 Zephagamon", () => {
  it("requires a play-cost-10-or-higher level-6 Vortex Warriors base for its cost-1 route", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 6,
      traits: ["Vortex Warriors"],
      basePlayCostMin: 10,
      cost: 1,
      isAlternate: true,
    });
  });

  it("watches any Digimon suspension and unsuspends once per turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: { isSelf: true }, optional: true }],
        },
      ],
    });
  });

  it("scales the bottom-deck return by every two suspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", optional: true },
          {
            kind: "Return",
            to: "deckBottom",
            scaling: {
              per: 2,
              unit: "cards",
              filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
            },
          },
        ],
      });
    }
  });

  it("on play suspends one Digimon, then returns one opposing suspended Digimon per pair", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-101", as: "zephagamon" }],
          battleArea: [{ card: "BT1-010", as: "ownTarget" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent", suspended: true },
            { card: "BT1-010", as: "secondOpponent", suspended: true },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("ownTarget").instanceId);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("unsuspends itself when either player's Digimon suspends, only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-101", as: "zephagamon", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent" },
            { card: "BT1-010", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstOpponent").permanentId], 1);
    await settle(() => !s.perm("zephagamon").isSuspended);
    expect(s.perm("zephagamon").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId], 1);
    await settle();
    expect(s.perm("zephagamon").isSuspended).toBe(false);
  });

  it("uses the printed cost-1 Vortex Warriors alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-035", as: "vortexMega" }], hand: [{ card: "BT20-101", as: "zephagamon" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vortexMega").permanentId,
        instanceId: s.inst("zephagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vortexMega").topCard.cardId === "BT20-101" && s.state.pendingDecision === undefined);
    expect(s.perm("vortexMega").stack.map((card) => card.cardId)).toEqual(["EX11-035"]);
    expect(s.state.memory).toBe(0);
  });
});
