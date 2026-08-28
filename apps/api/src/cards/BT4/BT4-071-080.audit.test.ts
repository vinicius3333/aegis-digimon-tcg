import { describe, expect, it } from "vitest";
import type { CompiledCard } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-071.js";
import "./BT4-072.js";
import "./BT4-073.js";
import "./BT4-074.js";
import "./BT4-075.js";
import "./BT4-076.js";
import "./BT4-077.js";
import "./BT4-078.js";
import "./BT4-079.js";
import "./BT4-080.js";

type Node = Record<string, any>;

const CARD_IDS = Array.from({ length: 10 }, (_, index) => `BT4-${String(index + 71).padStart(3, "0")}`);

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

describe("BT4-071 through BT4-080 direct IR audit evidence", () => {
  it("registers every card in ascending order as residual-free direct runtime IR", () => {
    for (const id of CARD_IDS) {
      const ir = card(id);
      expect(hasRegisteredCompiledCard(id), id).toBe(true);
      expect(ir.coverage, id).toBe("full");
      expect(ir.residual, id).toEqual([]);
    }
  });

  it("preserves BT4-071's D-Brigade deletion watcher and revealed play boundary", () => {
    expect(effect("BT4-071", "YourTurn").actions).toEqual([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: {
          controller: "mine",
          excludeSelf: true,
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }],
        },
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 2,
            add: [
              {
                filter: { nameOrTrait: [{ tokens: ["Commandramon"], match: "name" }] },
                count: 1,
                to: "play",
                optional: true,
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
    ]);
  });

  it("keeps BT4-072's Digi-Burst cost on its timed DP effect and its inherited aura separate", () => {
    const main = effect("BT4-072", "Main");
    expect(main.actions.map((action: Node) => action.kind)).toEqual(["ModifyDP"]);
    expect(main.actions[0]).toMatchObject({
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      amount: 2000,
      duration: "untilOpponentTurnEnd",
      cost: {
        kind: "trash",
        target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 1 },
        raw: "＜Digi-Burst 1＞",
      },
      abortOnDecline: true,
    });
    expect(effect("BT4-072", "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "true" },
        },
      ],
    });
  });

  it("keeps BT4-073's Blocker keyword and three-or-more opponent Digimon gate", () => {
    expect(effect("BT4-073", "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(effect("BT4-073", "OpponentsTurn").actions[0]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "modifyDP", amount: 3000 },
      while: {
        kind: "opponentHas",
        filter: { zone: "battleArea", controllerDefault: "opponent", kind: ["Digimon"] },
        count: 3,
      },
    });
  });

  it("keeps BT4-074's Rush, ordered D-Brigade recovery, and per-card memory gain", () => {
    expect(effect("BT4-074", "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Rush", raw: "＜Rush＞" }],
    });
    expect(effect("BT4-074", "OnPlay").actions).toEqual([
      {
        kind: "Return",
        target: {
          filter: {
            controller: "mine",
            zone: "trash",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }],
          },
          count: 5,
          upTo: true,
        },
        order: "any",
        trackCount: "returnedDBrigade",
        to: "deckTop",
      },
      { kind: "GainMemory", amount: 2, scaling: { per: 1, unit: "namedCount", countSource: "returnedDBrigade" } },
    ]);
  });

  it("keeps BT4-075's Security Attack and defending-player optional redirect", () => {
    expect(effect("BT4-075", "Static").keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
    expect(effect("BT4-075", "WhenAttacking").actions).toEqual([
      {
        kind: "RedirectAttack",
        target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
        chooser: "opponent",
        optional: true,
      },
    ]);
  });

  it("keeps BT4-076 and BT4-080 vanilla", () => {
    expect(card("BT4-076").effects).toEqual([]);
    expect(card("BT4-080").effects).toEqual([]);
  });

  it("keeps BT4-077's inherited Digi-Burst return and BT4-078's one-Option payment", () => {
    expect(effect("BT4-077", "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Return", target: { filter: { isSelfRef: true, zone: "trash" }, count: 1 }, to: "hand" }],
        },
      ],
    });
    expect(effect("BT4-078", "WhenAttacking").actions).toEqual([
      {
        kind: "GainMemory",
        amount: 1,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", controller: "mine", kind: ["Option"] }, count: 1 },
          raw: "by trashing 1 Option card in your hand",
        },
        optional: true,
      },
    ]);
  });

  it("keeps BT4-079's draw-then-trash order", () => {
    expect(effect("BT4-079", "OnPlay").actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
  });
});
