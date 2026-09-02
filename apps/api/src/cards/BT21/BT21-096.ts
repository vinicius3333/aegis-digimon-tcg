import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-096";
const marcusSelection: Target = {
  filter: {
    controller: "mine",
    kind: ["Tamer"],
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
  },
  count: 1,
  bindAs: "chosenMarcus",
};
const chosenMarcus: Target = { filter: {}, count: 1, fromSelectionRef: "chosenMarcus" };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SelectBind", target: marcusSelection },
        {
          kind: "GrantStatic",
          target: chosenMarcus,
          grant: "kind",
          tokens: ["Digimon"],
          staticEffect: { kind: "SetBaseDP", value: 12000 },
          duration: "forTheTurn",
        },
        { kind: "Restrict", target: chosenMarcus, restriction: "digivolve", duration: "forTheTurn" },
        {
          kind: "GainKeyword",
          target: chosenMarcus,
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "forTheTurn",
        },
        { kind: "GrantCanAttackUnsuspended", target: chosenMarcus, duration: "forTheTurn" },
        {
          kind: "Attack",
          target: chosenMarcus,
          withoutSuspending: false,
          attackPlayer: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
