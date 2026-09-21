import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const CHRONICLE_TRAIT: NonNullable<Filter["nameOrTrait"]>[number] = { tokens: ["Chronicle"], match: "trait" };

const whenDigivolving = (): Action[] => [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
    amount: -8000,
    duration: "untilOpponentTurnEnd",
    raw: "1 of your opponent's Digimon gets -8000 DP until their turn ends",
  },
  {
    kind: "GainMemory",
    amount: 2,
    condition: { kind: "memoryAtLeast", controller: "opponent", value: 5, raw: "they have 5 or more memory" },
    raw: "Then, if they have 5 or more memory, gain 2 memory",
  },
];

const chronicleEntryAttack = (): Action => ({
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: {
    controller: "mine",
    kind: ["Digimon", "Tamer"],
    nameOrTrait: [CHRONICLE_TRAIT],
  },
  actions: [
    {
      kind: "Attack",
      target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
      optional: true,
      effectTextPart: "When any of your [Chronicle] trait Digimon or Tamers are played, 1 of your Digimon may attack.",
      raw: "1 of your Digimon may attack",
    },
    {
      kind: "ReactivateEffect",
      fromTrigger: "WhenDigivolving",
      count: 1,
      optional: true,
      effectTextPart: "Then, you may activate 1 of this Digimon's [When Digivolving] effects.",
      raw: "Then, you may activate 1 of this Digimon's [When Digivolving] effects",
    },
  ],
  raw: "When any of your [Chronicle] trait Digimon or Tamers are played, 1 of your Digimon may attack. Then, you may activate 1 of this Digimon's [When Digivolving] effects",
});

const PLAYED_CARD_BINDING = "ex13-060-playedChronicleCard";

const endOfTurnDiscount = (): Action[] => [
  {
    kind: "PlayWithoutCost",
    target: {
      filter: {
        controller: "mine",
        nameOrTrait: [CHRONICLE_TRAIT],
        excludeNames: ["Alphamon"],
      },
      count: 1,
    },
    from: ["hand"],
    payCost: true,
    allowDigiXros: true,
    reduceCostBy: 6,
    optional: true,
    abortOnDecline: true,
    bindResultAs: PLAYED_CARD_BINDING,
    raw: "You may play 1 [Chronicle] trait card without [Alphamon] in its name from your hand with the cost reduced by 6",
  },
  {
    kind: "GainKeyword",
    target: { filter: { boundRef: PLAYED_CARD_BINDING, kind: ["Digimon"] }, count: 1 },
    keyword: { keyword: "Rush", raw: "＜Rush＞" },
    duration: "forTheTurn",
    raw: "It gains ＜Rush＞ for the turn",
  },
];

export const compiled: CompiledCard = {
  cardId: "EX13-060",
  effects: [
    { trigger: "WhenDigivolving", actions: whenDigivolving() },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [chronicleEntryAttack()] },
    { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: endOfTurnDiscount() },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Grademon"], cost: 4, isAlternate: true },
    { level: 5, traits: ["Chronicle"], cost: 4, isAlternate: true },
  ],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, traits: ["Chronicle"], count: 1 },
        { level: 4, traits: ["Chronicle"], count: 1 },
        { level: 3, traits: ["Chronicle"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-060", compiled);
