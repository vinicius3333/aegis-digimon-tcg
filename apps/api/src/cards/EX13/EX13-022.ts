import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playVeedramonTamer = (): Action => ({
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      zone: "hand",
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  optional: true,
});

const sharedPlayWindow = (trigger: CardEffect["trigger"]): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-0",
  actions: [playVeedramonTamer()],
});

const lockOpponentPermanent: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Tamer"] },
  actions: [
    {
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
    },
  ],
};

const inheritedUnsuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  hostFilter: { nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    sharedPlayWindow("OnPlay"),
    sharedPlayWindow("WhenDigivolving"),
    sharedPlayWindow("WhenAttacking"),
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [lockOpponentPermanent] },
    { trigger: "AllTurns", frequency: "OncePerTurn", isInherited: true, actions: [inheritedUnsuspend] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-022", compiled);
