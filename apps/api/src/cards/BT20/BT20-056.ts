// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const recoveryAndBreed = (trigger: "OnPlay" | "WhenDigivolving") => ({
  trigger,
  actions: [
    {
      kind: "GainKeyword",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      keyword: { keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" },
      duration: "permanent",
    },
    {
      kind: "Digivolve",
      target: { filter: { zone: "breedingArea", controller: "mine", kind: ["Digimon"] }, count: 1 },
      into: { controllerDefault: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
      payCost: false,
      from: ["hand", "trash"],
      optional: true,
      condition: { kind: "duringAttack", raw: "during an attack" },
      abortOnDecline: true,
    },
  ],
});

export const compiled: any = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    recoveryAndBreed("OnPlay"),
    recoveryAndBreed("WhenDigivolving"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenSecurityRemoved",
        sourceFilter: { controller: "opponent" },
        actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -8000, duration: "forTheTurn" }],
      }],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "prevent",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        leaveCause: "otherThanByEffect",
        cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 } },
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-056", compiled);
