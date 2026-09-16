import type { Action, Cost, Filter, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const startOfMainPhaseActions: Action[] = [
  {
    effectTextPart:
      "[Start of Your Main Phase] [On Play] You may place your deck's top card face down under this Tamer.",
    kind: "PlaceUnder",
    target: { filter: { controller: "mine" }, count: 1 },
    fromDeckTop: true,
    faceDown: true,
    position: "bottom",
    optional: true,
  },
  {
    effectTextPart: "Then, if your opponent has a Digimon, gain 1 memory.",
    kind: "GainMemory",
    amount: 1,
    condition: {
      kind: "opponentHas",
      filter: { controllerDefault: "opponent", kind: ["Digimon"], zone: "battleArea" },
      raw: "if your opponent has a Digimon",
    },
  },
];

const trashThreeFaceDown: Cost = {
  kind: "trashBottomFaceDownUnderTamer",
  controller: "mine",
  count: 3,
  raw: "by trashing 3 bottom face-down cards from under any of your Tamers",
};

const holyBeastMaterial = (level: number): Filter => ({
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  colors: ["Yellow"],
  levels: [level],
  nameOrTrait: [{ tokens: ["Holy Beast"], match: "trait" }],
});

const placeLevel4UnderKudamon: Cost = {
  kind: "place",
  target: { filter: holyBeastMaterial(4), count: 1, from: ["trash"] },
  destination: "digivolutionStack",
  position: "bottom",
  host: {
    filter: {
      controller: "mine",
      kind: ["Digimon"],
      zone: "battleArea",
      nameOrTrait: [{ tokens: ["Kudamon"], match: "nameExact" }],
    },
    count: 1,
  },
  bindHostAs: "kudamonHost",
  raw: "and placing 1 level 4 [Holy Beast] trait yellow Digimon card from your trash as 1 of your [Kudamon]'s digivolution cards",
};

const placeLevel5UnderKudamon: Cost = {
  kind: "place",
  target: { filter: holyBeastMaterial(5), count: 1, from: ["trash"] },
  destination: "digivolutionStack",
  position: "bottom",
  host: { filter: { boundRef: "kudamonHost" }, count: 1 },
  raw: "and placing 1 level 5 [Holy Beast] trait yellow Digimon card from your trash as that [Kudamon]'s digivolution card",
};

const kudamonDigivolvesIntoKentaurosmon: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "compound",
    costs: [trashThreeFaceDown, placeLevel4UnderKudamon, placeLevel5UnderKudamon],
    raw: "By trashing 3 bottom face-down cards from under any of your Tamers and placing 1 each of level 4 and level 5 [Holy Beast] trait yellow Digimon cards from your trash as 1 of your [Kudamon]'s bottom digivolution cards",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Digivolve",
      target: { filter: {}, count: 1, fromSelectionRef: "kudamonHost" },
      into: {
        filter: {
          controller: "mine",
          zone: ["hand", "trash"],
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 1,
      ignoreLevelRequirement: true,
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: startOfMainPhaseActions },
    { trigger: "StartOfYourMainPhase", actions: startOfMainPhaseActions },
    { trigger: "Main", frequency: "OncePerTurn", actions: [kudamonDigivolvesIntoKentaurosmon] },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-071", compiled);
