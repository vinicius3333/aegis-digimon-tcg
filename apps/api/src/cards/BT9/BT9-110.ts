import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dex", "DeathX"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon with [Dex] or [DeathX] in its name in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "totalDigimonCount",
            op: "gte",
            value: 3,
            raw: "there are 3 or more Digimon in play (both players' combined)",
          },
          ifTrue: [
            {
              kind: "Delete",
              target: {
                filter: {
                  kind: ["Digimon"],
                  excludeNameOrTrait: [
                    {
                      tokens: ["X Antibody"],
                      match: "trait",
                    },
                  ],
                },
                count: "all",
              },
            },
          ],
          ifFalse: [
            {
              kind: "Delete",
              target: {
                filter: {
                  kind: ["Digimon"],
                  excludeNameOrTrait: [
                    {
                      tokens: ["X Antibody"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              excludeNameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-110", compiled);
