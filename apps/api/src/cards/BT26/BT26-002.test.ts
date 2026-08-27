import { describe, expect, it } from "vitest";
import type { Primitives as EnginePrimitives } from "../../engine/effects/EffectContext.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-002.js";
import "../index.js";

function primitives(s: ReturnType<typeof setupEngine>): EnginePrimitives {
  return (s.engine as unknown as { primitives: EnginePrimitives }).primitives;
}

describe("BT26-002 Budmon", () => {
  it("is compiled as a once-per-turn inherited Your Turn watcher", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          isInherited: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDigivolutionTrashed",
              sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
            },
          ],
        },
      ],
    });
  });

  it("draws when an effect trashes a card under your Tamer and only once that turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "BT26-002", as: "budmon" }] },
          {
            card: "BT1-089",
            as: "tamer",
            under: [
              { card: "BT1-010", as: "underA" },
              { card: "BT1-011", as: "underB" },
            ],
          },
        ],
        deck: [
          { card: "BT1-012", as: "drawn" },
          { card: "BT1-013", as: "notDrawn" },
        ],
      },
    });
    await s.ready();

    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("underA").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);

    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("underB").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("does not draw when the Tamer-stack trash has no effect provenance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "BT26-002", as: "budmon" }] },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "under" }] },
        ],
        deck: ["BT1-012"],
      },
    });
    await s.ready();

    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("ignores cards under Digimon, cards under an opponent Tamer, and all events during the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            under: [{ card: "BT26-002" }, { card: "BT1-008", as: "digimonUnder" }],
          },
        ],
        deck: ["BT1-012"],
      },
      1: {
        battleArea: [
          { card: "BT1-089", as: "opponentTamer", under: [{ card: "BT1-010", as: "oppUnder" }] },
          { card: "BT1-089", as: "borrowedTamer", under: [{ card: "BT1-011", as: "turnUnder" }] },
        ],
      },
    });
    await s.ready();
    await primitives(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("digimonUnder").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await primitives(s).trashDigivolutionCards(s.perm("opponentTamer").permanentId, [s.inst("oppUnder").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    s.state.turnSeat = 1;
    s.perm("borrowedTamer").controllerSeat = 0;
    await primitives(s).trashDigivolutionCards(s.perm("borrowedTamer").permanentId, [s.inst("turnUnder").instanceId], {
      byEffectSeat: 1,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("gives separate Budmon copies independent once-per-turn draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "firstHost", under: [{ card: "BT26-002" }] },
          { card: "BT1-010", as: "secondHost", under: [{ card: "BT26-002" }] },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-011", as: "under" }] },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
