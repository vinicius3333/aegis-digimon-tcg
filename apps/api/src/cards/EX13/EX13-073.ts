import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const adventureTrait = [{ tokens: ["ADVENTURE"], match: "trait" as const }];

const ownAdventureDigimon: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  nameOrTrait: adventureTrait,
};

const bigAdventureDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  levelComparison: { op: "gte", value: 5 },
  nameOrTrait: adventureTrait,
};

const grantKeyword = (keyword: "Rush" | "Blocker"): Action => ({
  kind: "GainKeyword",
  target: { filter: bigAdventureDigimon, count: "all" },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
});

const drawAndTrash: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-073",
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: ownAdventureDigimon,
            raw: "you have an [ADVENTURE] trait Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: adventureTrait },
          raw: "[Your Turn] When your [ADVENTURE] trait Digimon or Tamers are played, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand.",
          actions: [drawAndTrash],
        },
      ],
    },
    { trigger: "AllTurns", actions: [grantKeyword("Rush"), grantKeyword("Blocker")] },
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

registerIrCard("EX13-073", compiled);
