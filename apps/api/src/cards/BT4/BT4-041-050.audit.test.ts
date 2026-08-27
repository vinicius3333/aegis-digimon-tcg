import { describe, expect, it } from "vitest";
import type { CompiledCard } from "@aegis/shared";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-041.js";
import "./BT4-042.js";
import "./BT4-043.js";
import "./BT4-044.js";
import "./BT4-045.js";
import "./BT4-046.js";
import "./BT4-047.js";
import "./BT4-048.js";
import "./BT4-049.js";
import "./BT4-050.js";

type Node = Record<string, any>;

const CARD_IDS = Array.from({ length: 10 }, (_, index) => `BT4-${String(index + 41).padStart(3, "0")}`);

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

describe("BT4-041 through BT4-050 direct IR audit evidence", () => {
  it("registers every card in the range as a residual-free direct runtime record", () => {
    for (const id of CARD_IDS) {
      const ir = card(id);
      expect(hasRegisteredCompiledCard(id), id).toBe(true);
      expect(ir.coverage, id).toBe("full");
      expect(ir.residual, id).toEqual([]);
    }
  });

  it("preserves BT4-041 and BT4-044's security-gated opposing DP reductions", () => {
    expect(effect("BT4-041", "OnPlay").actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
    expect(effect("BT4-044", "WhenAttacking").actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("keeps BT4-042's Blocker and memory-loss timing separate from vanilla BT4-043", () => {
    expect(effect("BT4-042", "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });
    expect(effect("BT4-042", "WhenAttacking").actions).toEqual([{ kind: "GainMemory", amount: -2 }]);
    expect(card("BT4-043").effects).toEqual([]);
  });

  it("keeps BT4-045's opponent-turn security DP aura and its three-or-fewer gate", () => {
    expect(effect("BT4-045", "OpponentsTurn").actions[0]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "modifySecurityDP", seat: "mine", amount: 4000 },
      while: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("attaches BT4-046 and BT4-049 Digi-Burst costs to their printed DP effects only", () => {
    const warGrowlmon = effect("BT4-046", "Main");
    expect(warGrowlmon.actions.map((action: Node) => action.kind)).toEqual(["ModifyDP"]);
    expect(warGrowlmon.actions[0]).toMatchObject({
      amount: -4000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } },
    });
    expect(effect("BT4-046", "YourTurn")).toMatchObject({ isInherited: true });

    const varodurumon = effect("BT4-049", "Main");
    expect(varodurumon.actions.map((action: Node) => action.kind)).toEqual(["ModifyDP"]);
    expect(varodurumon.actions[0]).toMatchObject({
      amount: -4000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 3 } },
    });
  });

  it("keeps BT4-047's recovery and end-of-opponent-turn security trash as distinct actions", () => {
    expect(effect("BT4-047", "WhenDigivolving").actions).toEqual([
      { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 2 },
    ]);
    expect(effect("BT4-047", "EndOfOpponentsTurn").actions).toEqual([
      { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1 },
    ]);
  });

  it("preserves BT4-048's optional security payment, unsuspend, target reduction, and frequency", () => {
    const whenAttacking = effect("BT4-048", "WhenAttacking");
    expect(whenAttacking.frequency).toBe("OncePerTurn");
    expect(whenAttacking.actions.map((action: Node) => action.kind)).toEqual([
      "SecurityManipulation",
      "Unsuspend",
      "ModifyDP",
    ]);
    expect(whenAttacking.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      controller: "mine",
      optional: true,
      abortOnDecline: true,
    });
    expect(whenAttacking.actions[1]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    });
    expect(whenAttacking.actions[2]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("keeps BT4-050 vanilla", () => {
    expect(card("BT4-050").effects).toEqual([]);
  });
});
