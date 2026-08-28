// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns] triggered when a [Composite]/[Twilight] Digimon with DigiXros requirements
// would be played. Cost: suspend this Tamer. Effect: also allows 1 card from under any
// Tamer AND 1 card from trash as DigiXros materials (KB Q3153-Q3157: these are additive
// per Tamer copy; you may place from just one area).
// CAP-H-05 implemented: sourceFilter now carries hasDigiXrosRequirement: true, restricting
// the replacement to [Composite]/[Twilight] Digimon that actually have DigiXros requirements
// (defined in their IR registry entry), not merely any Digimon with those traits.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Composite", "Twilight"],
                match: "trait",
              },
            ],
            hasDigiXrosRequirement: true,
          },
          mode: "instead",
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              zones: ["tamerCards", "trash"],
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
            },
          ],
          raw: "by suspending this Tamer, 1 card under your Tamers and 1 card in your trash can also be placed for their DigiXros",
        },
      ],
    },
    {
      trigger: "Security",
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
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-087", compiled);
