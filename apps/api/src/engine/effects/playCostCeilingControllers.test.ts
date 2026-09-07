import { describe, expect, it } from "vitest";
import type { Action, Controller, Seat, Target } from "@aegis/shared";
import { applyPlayCostCeiling } from "./interpreter/actions/play.js";
import type { EffectContext } from "./EffectContext.js";

function context(ownTrash: number, opponentTrash: number): EffectContext {
  const players = [
    {
      seat: 0,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: Array.from({ length: ownTrash }, (_, i) => ({
        instanceId: `own-${i}`,
        cardId: "JUNK",
        ownerSeat: 0,
        faceUp: true,
      })),
    },
    {
      seat: 1,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: Array.from({ length: opponentTrash }, (_, i) => ({
        instanceId: `opp-${i}`,
        cardId: "JUNK",
        ownerSeat: 1,
        faceUp: true,
      })),
    },
  ];
  const game = {
    state: { memory: 0, players, turnSeat: 0 },
    player: (seat: Seat) => players[seat],
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
  };
  return {
    source: { ownerSeat: 0 },
    trigger: {},
    game,
    fx: {},
    ask: {},
    selections: new Map(),
  } as unknown as EffectContext;
}

function ceilingAction(controller?: Controller | "both"): Extract<Action, { kind: "PlayWithoutCost" }> {
  return {
    kind: "PlayWithoutCost",
    target: { filter: { controller: "mine", kind: ["Digimon"], playCostLte: 3 }, count: 1 },
    from: ["trash"],
    payCost: false,
    playCostCeiling: {
      base: 3,
      raise: 2,
      per: 10,
      // "both" is retained as a compatibility spelling in this regression; the public Filter
      // type uses "any" for the same two-seat scope.
      filter: { zone: "trash", controller: controller as Controller | undefined },
      unit: "cards",
    },
  } as Extract<Action, { kind: "PlayWithoutCost" }>;
}

function computedCeiling(ownTrash: number, opponentTrash: number, controller?: Controller | "both"): number {
  const action = ceilingAction(controller);
  const target = action.target as Target;
  const result = applyPlayCostCeiling(context(ownTrash, opponentTrash), action, target);
  return result.filter.playCostLte!;
}

describe("playCostCeiling controller scope", () => {
  it.each(["any", "both", undefined] as const)("counts both trashes for controller %s", (controller) => {
    expect(computedCeiling(5, 5, controller)).toBe(5);
  });

  it("keeps the threshold boundary at nine cards", () => {
    expect(computedCeiling(4, 5, "any")).toBe(3);
    expect(computedCeiling(5, 5, "any")).toBe(5);
  });

  it("scopes mine to the source player's trash", () => {
    expect(computedCeiling(9, 1, "mine")).toBe(3);
    expect(computedCeiling(10, 0, "mine")).toBe(5);
    expect(computedCeiling(0, 10, "mine")).toBe(3);
  });

  it("scopes opponent to the other player's trash", () => {
    expect(computedCeiling(1, 9, "opponent")).toBe(3);
    expect(computedCeiling(0, 10, "opponent")).toBe(5);
    expect(computedCeiling(10, 0, "opponent")).toBe(3);
  });
});
