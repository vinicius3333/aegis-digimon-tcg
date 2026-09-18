import type {
  Action,
  CardEffect,
  CompiledCard,
  Filter,
  Target,
} from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };

const ownDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
};

const changeOrientation: Action = {
  kind: "Modal",
  choose: 1,
  optional: true,
  labels: [
    "Suspend 1 of your unsuspended Digimon",
    "Unsuspend 1 of your suspended Digimon",
  ],
  optionConditions: [
    {
      kind: "youHave",
      filter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        zone: "battleArea",
        unsuspended: true,
      },
      raw: "you have an unsuspended Digimon",
    },
    {
      kind: "youHave",
      filter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        zone: "battleArea",
        suspended: true,
      },
      raw: "you have a suspended Digimon",
    },
  ],
  options: [
    [
      {
        kind: "Suspend",
        target: { filter: { ...ownDigimon, unsuspended: true }, count: 1 },
      },
    ],
    [
      {
        kind: "Unsuspend",
        target: { filter: { ...ownDigimon, suspended: true }, count: 1 },
      },
    ],
  ],
  raw: "1 of your Digimon may change orientation",
};

const returnFewestStacked: Action = {
  kind: "Return",
  target: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
      superlative: "lowestDigivolutionCards",
    },
    count: "all",
  },
  to: "deckBottom",
  optional: true,
  raw: "return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck",
};

const orientationEffect = (
  trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking",
): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-orientation",
  actions: [changeOrientation],
});

const returnEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [returnFewestStacked],
});

const unsuspendedGate = {
  kind: "selfUnsuspended" as const,
  raw: "this Digimon is unsuspended",
};

const protection: Action[] = [
  {
    kind: "Restrict",
    target: self,
    restriction: "dpImmune",
    byOpponentEffectsOnly: true,
    while: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't reduce this unsuspended Digimon's DP",
  },
  {
    kind: "StackTrashLock",
    target: self,
    condition: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't trash this unsuspended Digimon's stacked cards",
  },
  {
    kind: "Restrict",
    target: self,
    restriction: "stackReturn",
    byOpponentEffectsOnly: true,
    while: unsuspendedGate,
    duration: "permanent",
    raw: "your opponent's effects can't return this unsuspended Digimon's stacked cards to the hand or deck",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    },
    orientationEffect("OnPlay"),
    orientationEffect("WhenDigivolving"),
    orientationEffect("WhenAttacking"),
    returnEffect("OnPlay"),
    returnEffect("WhenDigivolving"),
    { trigger: "AllTurns", actions: protection },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
  ],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, names: ["Veemon", "Veedramon"], count: 1 },
        { level: 4, names: ["Veemon", "Veedramon"], count: 1 },
        { level: 3, names: ["Veemon", "Veedramon"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-023", compiled);
