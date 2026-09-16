import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const knightmonText = [{ tokens: ["Knightmon"], match: "text" as const }];

const playableFromHand = {
  filter: {
    controllerDefault: "mine",
    zone: "hand",
    kind: ["Digimon", "Tamer"],
    playCostLte: 4,
    nameOrTrait: knightmonText,
  },
  count: 1,
} satisfies Target;

const optionInHand = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Option"],
  playCostLte: 4,
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
        target: playableFromHand,
        from: ["hand"],
        payCost: false,
        optional: true,
        raw: "You may play 1 card with [Knightmon] in its text and a play cost of 4 or less from your hand without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHand,
        from: ["hand"],
        payCost: false,
        optional: true,
        raw: "You may use 1 card with [Knightmon] in its text and a use cost of 4 or less from your hand without paying the cost",
      },
    ],
  ],
};

const playOrUse = (trigger: "WhenAttacking" | "OnDeletion"): CardEffect => ({
  trigger,
  actions: [playOrUseKnightmonCard],
});

const grantDuringOpponentTurn = (keyword: "Reboot" | "Blocker"): Action => ({
  kind: "GainKeyword",
  target: {
    filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: knightmonText },
    count: "all",
  },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
  raw: `All of your Digimon with [Knightmon] in their texts gain ＜${keyword}＞`,
});

const deDigivolveOnKnightmonPlay: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: knightmonText },
  actions: [
    {
      kind: "DeDigivolve",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      raw: "＜De-Digivolve 1＞ 1 of your opponent's Digimon",
    },
  ],
  raw: "When any of your Digimon with [Knightmon] in their texts are played, ＜De-Digivolve 1＞ 1 of your opponent's Digimon",
};

export const compiled: CompiledCard = {
  cardId: "EX13-058",
  effects: [
    playOrUse("WhenAttacking"),
    playOrUse("OnDeletion"),
    {
      trigger: "OpponentsTurn",
      actions: [grantDuringOpponentTurn("Reboot"), grantDuringOpponentTurn("Blocker")],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [deDigivolveOnKnightmonPlay],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, texts: ["Knightmon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-058", compiled);
