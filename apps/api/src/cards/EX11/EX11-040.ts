import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [{ namesExact: ["Maquinamon"], cost: 2, isAlternate: true }],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          recipient: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Unchained"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              condition: {
                kind: "permanentCount",
                seat: "mine",
                filter: {
                  controller: "mine",
                  kind: ["Tamer"],
                },
                op: "lte",
                value: 1,
                raw: "if you have 1 or fewer Tamers",
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-040", compiled);
