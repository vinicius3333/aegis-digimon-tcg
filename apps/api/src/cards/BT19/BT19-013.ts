// @ts-nocheck
// HAND-FIXED IR for BT19-013 — do not regenerate.
// Replacement PlaceUnder: added from:["digivolutionCards"] (source must be leaving Digimon's stack).
// OnDeletion PlayWithoutCost: added playCost lte 4 (text: "play cost 4 or lower").
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart"],
                      match: "trait",
                    },
                  ],
                },
                count: 3,
                upTo: true,
              },
              from: ["digivolutionCards"],
              underFilter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamers",
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
              playCost: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-013", compiled);
