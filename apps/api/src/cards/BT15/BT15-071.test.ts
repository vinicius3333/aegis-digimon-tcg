import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-071.js";
import "../index.js";

describe("BT15-071", () => {
  it("may trash a hand card to delete an opposing Digimon with 3000 DP or less and draws with SoC in stack", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 3000 } } },
      cost: { kind: "trash" },
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });
  it("gains 1 memory once per turn after attacking when the opponent has memory", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtLeast" } }],
    }));

  it("naturally pays the hand cost, deletes at 3000 DP, draws from a stacked SoC Tamer, and gains end-of-attack memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-071", as: "loogamon", under: ["BT14-087"] }],
          hand: [{ card: "BT1-001", as: "costCard" }],
          deck: [{ card: "BT1-002", as: "drawn" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("naturally pays the hand cost and still draws when no opposing Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-071", as: "loogamon", under: ["BT14-087"] }],
          hand: [{ card: "BT1-001", as: "costCard" }],
          deck: [{ card: "BT1-002", as: "drawn" }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
