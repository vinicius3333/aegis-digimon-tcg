import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimonOrTamer: Filter = { controller: "opponent", kind: ["Digimon", "Tamer"] };

const suspendLock: Action = {
  kind: "Restrict",
  target: { filter: opponentDigimonOrTamer, count: 2 },
  restriction: "suspend",
  duration: "untilOpponentTurnEnd",
  blocksCombatSuspend: true,
};

const deleteByStackCount: Action = {
  kind: "Delete",
  target: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
      relativeTo: { attr: "digivolutionCount", op: "lte", selectionRef: "source" },
    },
    count: 1,
  },
  optional: true,
};

const body = (trigger: CardEffect["trigger"]): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "EX13-016/once-per-turn",
  actions: [suspendLock],
});

const deleteBody = (trigger: CardEffect["trigger"]): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "EX13-016/delete-once-per-turn",
  actions: [
    {
      kind: "SelectBind",
      target: { filter: { isSelfRef: true }, count: 1, bindAs: "source" },
    },
    deleteByStackCount,
  ],
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid" }, { keyword: "Blocker" }] },
    body("OnPlay"),
    body("WhenDigivolving"),
    body("WhenAttacking"),
    deleteBody("OnPlay"),
    deleteBody("WhenDigivolving"),
    deleteBody("Counter"),
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
          },
          actions: [],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 6, traits: ["CS"], cost: 5, isAlternate: true }],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { level: 6, names: ["Greymon"] },
        { level: 6, names: ["Garurumon"] },
      ],
    },
  ],
  assemblyRequirement: [
    {
      reduceCost: 7,
      materials: [
        { namesExact: ["WarGreymon"], count: 1 },
        { namesExact: ["MetalGarurumon"], count: 1 },
        { namesExact: ["Agumon"], count: 1 },
        { namesExact: ["Gabumon"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-016", compiled);
