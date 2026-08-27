// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const recoveryBody = [
  { kind: "SecurityManipulation", op: "toHand", controller: "mine", source: "securityTop", amount: 1 },
  { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
];

const eligibleIliad = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Digimon"],
  colors: ["Blue"],
  nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
  orFilters: [
    {
      controllerDefault: "mine",
      zone: "hand",
      kind: ["Digimon"],
      colors: ["Red"],
      nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
    },
  ],
};

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
  effects: [
    { trigger: "OnPlay", actions: recoveryBody },
    { trigger: "WhenDigivolving", actions: recoveryBody },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"], colors: ["Red"] },
              },
              {
                kind: "youHave",
                filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"], colors: ["Purple"] },
              },
            ],
          },
          cost: {
            kind: "place",
            destination: "security",
            position: "bottom",
            targetIsPermanent: true,
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: eligibleIliad, count: 1 },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 4,
              optional: true,
            },
          ],
        },
      ],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-022", compiled);
