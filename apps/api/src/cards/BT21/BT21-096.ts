import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-096";
const marcusSelection: Target = {
  filter: {
    controller: "mine",
    kind: ["Tamer"],
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }],
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
          effectTextPart:
            "[Main] For the turn, 1 of your [Marcus Damon]s is also treated as a 12000 DP Digimon, can't digivolve and gains ＜Rush＞.",
          kind: "GainKeyword",
          target: chosenMarcus,
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "forTheTurn",
        },
        { kind: "GrantCanAttackUnsuspended", target: chosenMarcus, duration: "forTheTurn" },
        {
          effectTextPart:
            "Then, that Digimon may attack your opponent's Digimon. Your opponent's unsuspended Digimon can also be attacked with this effect.",
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
          effectTextPart: "[Security] You may play 1 [Marcus Damon] from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] },
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
