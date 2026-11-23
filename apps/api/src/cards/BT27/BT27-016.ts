import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CardEffect, CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const huckmonTextOnField: Filter = {
  controllerDefault: "mine",
  zone: ["battleArea", "breeding"],
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

const boostText = "This Digimon gets +6000 DP until your opponent's turn ends.";
const activateMainText =
  "Then, by returning 1 of your other Digimon or 1 [Jesmon] or [X Antibody] from this Digimon's digivolution cards to the bottom of the deck, activate 1 [Main] effect on this card's Option side.";
const optionPlacementText =
  "[Main] By placing 1 of your opponent's lowest DP Digimon as the bottom security card, trash their top security card.";

const boostThenActivateMain: Action[] = [
  {
    kind: "ModifyDP",
    effectTextPart: boostText,
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    amount: 6000,
    duration: "untilOpponentTurnEnd",
  },
  {
    kind: "ActivateMain",
    effectTextPart: activateMainText,
    optional: true,
    costOptions: [
      {
        kind: "return",
        target: { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 },
        to: "deckBottom",
        raw: "by returning 1 of your other Digimon to the bottom of the deck",
      },
      {
        kind: "return",
        target: {
          filter: {
            zone: "digivolutionCards",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Jesmon", "X Antibody"], match: "nameExact" }],
            hostFilter: { isSelfRef: true },
          },
          count: 1,
        },
        to: "deckBottom",
        raw: "by returning 1 [Jesmon] or [X Antibody] from this Digimon's digivolution cards to the bottom of the deck",
      },
    ],
  },
];

const boostThenActivateMainOn = (trigger: CardEffect["trigger"]): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "BT27-016/boost-activate-main",
  actions: boostThenActivateMain,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Progress", raw: "＜Progress＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Engage", raw: "＜Engage＞" },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "youHave", filter: huckmonTextOnField, raw: "Use Req. ＜[Huckmon] in text＞" },
        },
      ],
    },
    boostThenActivateMainOn("WhenDigivolving"),
    boostThenActivateMainOn("WhenAttacking"),
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          effectTextPart: optionPlacementText,
          op: "addBottom",
          controller: "opponent",
          source: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
          faceDown: true,
        },
        {
          kind: "SecurityManipulation",
          effectTextPart: optionPlacementText,
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
  ],
  digivolutionRequirement: [{ namesExact: ["Jesmon"], cost: 1, isAlternate: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-016", compiled);
