import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Three Musketeers", "ThreeMusketeers"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Option"],
                playCostOneOf: [7],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  baseGrantedDigivolve: [
    {
      target: { traits: ["Three Musketeers"] },
      cost: 6,
      ignoreRequirements: true,
    },
  ],
};

registerIrCard("BT6-060", compiled);
