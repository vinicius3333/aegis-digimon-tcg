import type { Action } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { describeAction, describeCost } from "./describe.js";

describe("describeAction", () => {
  it("prefers the printed sub-clause over any generated summary", () => {
    const action = {
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      amount: 1,
      raw: "By returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.",
    } as Action;
    expect(describeAction(action)).toBe("By returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.");
  });

  it("describes a cost-gated block by its cost and payload instead of its kind", () => {
    const action = {
      kind: "CostGatedBlock",
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "GainMemory", amount: 1 },
      ],
    } as Action;
    expect(describeAction(action)).toBe("By paying: Trash 1 card(s) from hand → Draw 1, Gain 1 memory");
  });

  it("describes security manipulation by its operation", () => {
    expect(
      describeAction({ kind: "SecurityManipulation", op: "addTop", controller: "mine", amount: 2 } as Action),
    ).toBe("＜Recovery +2＞");
    expect(
      describeAction({ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 } as Action),
    ).toBe("Trash 1 of opponent's top security card(s)");
  });

  it("prefixes an action's own activation cost", () => {
    const action = {
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      amount: 1,
      cost: { kind: "return", target: { count: 3, filter: { zone: "trash" } }, to: "deckBottom" },
    } as Action;
    expect(describeAction(action)).toBe("By paying: Return 3 card(s) → ＜Recovery +1＞");
  });

  it("leaves an unmapped kind as a bare identifier for the client to replace", () => {
    expect(describeAction({ kind: "Aura" } as Action)).toBe("Aura");
  });
});

describe("describeCost", () => {
  it("spells out memory and compound costs", () => {
    expect(describeCost({ kind: "payMemory", memory: 2 })).toBe("Pay 2 memory");
    expect(
      describeCost({
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 1 },
          { kind: "suspend", target: { count: 1, filter: {} } },
        ],
      }),
    ).toBe("Pay 1 memory and Suspend 1 card(s)");
  });
});
