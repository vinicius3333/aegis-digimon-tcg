import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const knightmonText = [{ tokens: ["Knightmon"], match: "text" as const }];

const ownKnightmonTextDigimon = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: knightmonText,
} satisfies Filter;

const playableFromHandOrTrash = {
  filter: { controllerDefault: "mine", kind: ["Digimon", "Tamer"], playCostLte: 8, nameOrTrait: knightmonText },
  count: 1,
} satisfies Target;

const optionInHandOrTrash = {
  controllerDefault: "mine",
  kind: ["Option"],
  playCostLte: 8,
  nameOrTrait: knightmonText,
} satisfies Filter;

const playOrUseKnightmonCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Knightmon]-text card", "Use a [Knightmon]-text Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableFromHandOrTrash,
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        raw: "You may play 1 play cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHandOrTrash,
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        raw: "You may use 1 use cost 8 or lower [Knightmon] text card from your hand or trash without paying the cost",
      },
    ],
  ],
};

const grantDuringYourTurn = (keyword: "Alliance" | "Piercing"): Action => ({
  kind: "GainKeyword",
  target: { filter: ownKnightmonTextDigimon, count: "all" },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
  raw: `All of your [Knightmon] text Digimon gain ＜${keyword}＞`,
});

const RUSHER = "EX13-064/rush-collision-attacker";

const chooseKnightmonTextAttacker: Action = {
  kind: "SelectBind",
  target: { filter: ownKnightmonTextDigimon, count: 1, bindAs: RUSHER },
  optional: true,
  abortOnDecline: true,
  preserveOncePerTurnOnDecline: true,
  raw: "1 of your [Knightmon] text Digimon may",
};

const grantForTheTurn = (keyword: "Rush" | "Collision"): Action => ({
  kind: "GainKeyword",
  target: { fromSelectionRef: RUSHER, filter: {}, count: 1 },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "forTheTurn",
  raw: `gain ＜${keyword}＞ for the turn`,
});

const rushCollisionAttack: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], excludeSelf: true },
  actions: [
    chooseKnightmonTextAttacker,
    grantForTheTurn("Rush"),
    grantForTheTurn("Collision"),
    {
      kind: "Attack",
      target: { fromSelectionRef: RUSHER, filter: {}, count: 1 },
      raw: "and attack",
    },
  ],
  raw: "When any of your other Digimon or Tamers are played, 1 of your [Knightmon] text Digimon may gain ＜Rush＞ and ＜Collision＞ for the turn and attack",
};

const whenDigivolving: CardEffect = { trigger: "WhenDigivolving", actions: [playOrUseKnightmonCard] };

export const compiled: CompiledCard = {
  cardId: "EX13-064",
  effects: [
    whenDigivolving,
    { trigger: "YourTurn", actions: [grantDuringYourTurn("Alliance"), grantDuringYourTurn("Piercing")] },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [rushCollisionAttack] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, texts: ["Knightmon"], cost: 3, isAlternate: true },
    {
      namesExact: ["Rie Kishibe"],
      baseIsTamer: true,
      cost: 5,
      isAlternate: true,
      whileCondition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "security",
        op: "lte",
        value: 3,
        raw: "while you have 3 or fewer security cards",
      },
    },
  ],
};

registerIrCard("EX13-064", compiled);
