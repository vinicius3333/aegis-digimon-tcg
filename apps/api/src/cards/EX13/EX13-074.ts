import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const knightmonTextDigimonOnBoard: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
  printedTextOnly: true,
};

const knightmonTextDigimonCard: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
};

const placeThenDraw: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  cost: {
    kind: "place",
    target: {
      filter: knightmonTextDigimonCard,
      count: 1,
      from: ["hand", "trash"],
    },
    raw: "by placing 1 such card from your hand or trash under this Tamer",
    destination: "digivolutionStack",
    position: "bottom",
    host: "target",
    underFilter: { isSelfRef: true },
  },
  optional: true,
  abortOnDecline: true,
};

const ONCE_PER_TURN_KEY = "EX13-074/all-turns";

const playedOrDeletedWatcher: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [
    {
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: knightmonTextDigimonOnBoard,
      oncePerTurnKey: ONCE_PER_TURN_KEY,
      actions: [placeThenDraw],
    },
    {
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: knightmonTextDigimonOnBoard,
      oncePerTurnKey: ONCE_PER_TURN_KEY,
      actions: [placeThenDraw],
    },
  ],
};

const digivolveIntoLordKnightmon: Action = {
  kind: "Digivolve",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  into: {
    controllerDefault: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["LordKnightmon"], match: "nameExact" }],
  },
  from: ["hand", "trash"],
  payCost: true,
  costOverride: 3,
  ignoreRequirements: true,
  optional: true,
};

export const compiled: CompiledCard = {
  cardId: "EX13-074",
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    playedOrDeletedWatcher,
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      condition: {
        kind: "selfDigivolutionStackCountAtLeast",
        count: 3,
        filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
      },
      actions: [digivolveIntoLordKnightmon],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-074", compiled);
