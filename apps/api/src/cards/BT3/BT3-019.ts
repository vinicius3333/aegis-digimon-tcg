import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Durandamon", "BryweLudramon"],
                  match: "nameExact",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "top",
          optional: true,
        },
        {
          kind: "GainMemory",
          amount: 3,
          condition: {
            kind: "ifThisEffectActed",
            raw: "PlaceUnder resolved",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-019", compiled);
