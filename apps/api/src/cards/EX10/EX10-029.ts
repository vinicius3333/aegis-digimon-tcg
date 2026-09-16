import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      keywords: [],
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
              count: 1,
            },
            raw: "By trashing 1 of this Digimon's link cards",
          },
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "A",
              },
            },
            {
              kind: "Restrict",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "A",
              },
              restriction: "cantBeDeDigivolved",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "[When Linking] By trashing 1 of this Digimon's link cards, <De-Digivolve> effects don't affect 1 of your Digimon until your opponent's turn ends.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [
    {
      cost: 2,
      traits: ["Appmon"],
    },
  ],
};

export { compiled };

registerIrCard("EX10-029", compiled);
