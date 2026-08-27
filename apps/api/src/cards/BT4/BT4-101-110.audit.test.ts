import { describe, expect, it } from "vitest";
import type { CompiledCard } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-101.js";
import "./BT4-102.js";
import "./BT4-103.js";
import "./BT4-104.js";
import "./BT4-105.js";
import "./BT4-106.js";
import "./BT4-107.js";
import "./BT4-108.js";
import "./BT4-109.js";
import "./BT4-110.js";

type Node = Record<string, any>;

const CARD_IDS = Array.from({ length: 10 }, (_, index) => `BT4-${String(index + 101).padStart(3, "0")}`);

function card(id: string): CompiledCard {
  const compiled = runtimeCompiledCard(id);
  if (!compiled) throw new Error(`Missing runtime IR for ${id}`);
  return compiled;
}

function effect(id: string, trigger: string): Node {
  const found = card(id).effects.find((candidate) => candidate.trigger === trigger);
  if (!found) throw new Error(`Missing ${trigger} effect for ${id}`);
  return found as Node;
}

describe("BT4-101 through BT4-110 direct IR audit evidence", () => {
  it("registers every card in ascending order as residual-free direct runtime IR", () => {
    for (const id of CARD_IDS) {
      const ir = card(id);
      expect(hasRegisteredCompiledCard(id), id).toBe(true);
      expect(ir.coverage, id).toBe("full");
      expect(ir.residual, id).toEqual([]);
    }
  });

  it("preserves BT4-101's all-own aura and Security hand return", () => {
    expect(effect("BT4-101", "Main").actions).toEqual([
      {
        kind: "GrantAuraToOpponents",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
        effectText: "[Your Turn] When attacking an opponent's Digimon with no digivolution cards, delete that Digimon",
        duration: "forTheTurn",
      },
    ]);
    expect(effect("BT4-101", "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "AddToHandSelf" }],
    });
  });

  it("preserves BT4-102's own return before bound source trash and optional level returns", () => {
    expect(effect("BT4-102", "Main").actions).toEqual([
      {
        kind: "Return",
        target: { filter: { controller: "mine", kind: ["Digimon"], allowTokens: true }, count: 1 },
        to: "hand",
        raw: "by returning 1 of your Digimon to its owner's hand",
      },
      {
        kind: "SelectBind",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
          },
          count: 2,
          upTo: true,
          bindAs: "aquaViperTargets",
        },
      },
      {
        kind: "TrashDigivolution",
        target: { filter: {}, count: 2, fromSelectionRef: "aquaViperTargets" },
        amount: 99,
      },
      {
        kind: "Return",
        target: { filter: {}, count: 2, fromSelectionRef: "aquaViperTargets" },
        to: "hand",
      },
    ]);
    expect(effect("BT4-102", "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "AddToHandSelf" }],
    });
  });

  it("preserves BT4-103's bound target, source trash, and resolution-time hand branches", () => {
    const main = effect("BT4-103", "Main");
    expect(main.actions.map((action: Node) => action.kind)).toEqual([
      "SelectBind",
      "TrashDigivolution",
      "Return",
      "Return",
    ]);
    expect(main.actions[0]).toMatchObject({
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
        count: 1,
        bindAs: "fullMoonTarget",
      },
    });
    expect(main.actions[1]).toMatchObject({
      target: { fromSelectionRef: "fullMoonTarget", count: 1 },
      amount: 99,
    });
    expect(main.actions[2]).toMatchObject({
      target: { fromSelectionRef: "fullMoonTarget", count: 1 },
      to: "deckBottom",
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
    });
    expect(main.actions[3]).toMatchObject({
      target: { fromSelectionRef: "fullMoonTarget", count: 1 },
      to: "hand",
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lt", value: 8 },
    });
    expect(effect("BT4-103", "Security")).toMatchObject({ isSecurity: true, actions: main.actions });
  });

  it("preserves BT4-104's security trash followed by unconditional memory gain", () => {
    expect(effect("BT4-104", "Main").actions).toEqual([
      { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 2 },
    ]);
    expect(card("BT4-104").effects).toHaveLength(1);
  });

  it("preserves BT4-105's whole-stack trash before face-down top-security placement", () => {
    expect(effect("BT4-105", "Main").actions).toEqual([
      {
        kind: "TrashDigivolution",
        target: { filter: { controller: "mine", kind: ["Digimon"], allowTokens: true }, count: 1 },
        amount: 99,
      },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        source: { filter: {}, count: 1, sameTarget: true },
        toTop: true,
      },
    ]);
    expect(effect("BT4-105", "Security")).toEqual({
      trigger: "Security",
      actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", from: ["deck"], amount: 1 }],
      isSecurity: true,
    });
  });

  it("preserves BT4-106's all-opponent timed DP reduction and Security activation", () => {
    expect(effect("BT4-106", "Main").actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        amount: -3000,
        duration: "forTheTurn",
      },
    ]);
    expect(effect("BT4-106", "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });

  it("preserves BT4-107's Digi-Burst text filter and added-card suspension count", () => {
    const main = effect("BT4-107", "Main");
    expect(main.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Digi-Burst"], match: "text" }],
          },
          count: "all",
          to: "hand",
        },
      ],
      rest: "deckBottom",
      trackCount: "addedByPollenSpray",
    });
    expect(main.actions[1]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      scaling: { per: 1, unit: "namedCount", countSource: "addedByPollenSpray" },
    });
    expect(effect("BT4-107", "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });

  it("preserves BT4-108's printed unsuspend-then-suspend order", () => {
    expect(effect("BT4-108", "Main").actions).toEqual([
      { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
      { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
    ]);
    expect(effect("BT4-108", "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });

  it("preserves BT4-109's one-target threshold and all three timed keywords", () => {
    const main = effect("BT4-109", "Main");
    expect(main.actions.map((action: Node) => action.kind)).toEqual([
      "ModifyDP",
      "GainKeyword",
      "GainKeyword",
      "GainKeyword",
    ]);
    expect(main.actions[0]).toMatchObject({
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      amount: 3000,
      duration: "untilOpponentTurnEnd",
    });
    expect(main.actions.slice(1)).toEqual([
      {
        kind: "GainKeyword",
        target: { filter: { controllerDefault: "mine" }, count: 1, sameTarget: true },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "lastTargetDpAtLeast", value: 13000 },
      },
      {
        kind: "GainKeyword",
        target: { filter: { controllerDefault: "mine" }, count: 1, sameTarget: true },
        keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "lastTargetDpAtLeast", value: 13000 },
      },
      {
        kind: "GainKeyword",
        target: { filter: { controllerDefault: "mine" }, count: 1, sameTarget: true },
        keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "lastTargetDpAtLeast", value: 13000 },
      },
    ]);
    expect(effect("BT4-109", "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "AddToHandSelf" }] });
  });

  it("preserves BT4-110's dynamic D-Brigade deletion ceiling", () => {
    expect(effect("BT4-110", "Main").actions).toEqual([
      {
        kind: "Delete",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            playCostLte: 3,
            playCostLteScaling: {
              per: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }],
              },
              unit: "cards",
            },
          },
          count: 1,
        },
      },
    ]);
    expect(effect("BT4-110", "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
