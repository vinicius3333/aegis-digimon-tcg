import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * BT3-030 — Leopardmon.
 *
 * The free-play pool spans the controller's Digimon stacks, including this
 * Digimon's own stack (Q1065). The Jamming grant is reevaluated against its
 * original level filter so a recipient immediately loses it after becoming
 * level 5 or higher (Q1066).
 */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              zone: "digivolutionCards",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: "all",
          },
          keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
          duration: "forTheTurn",
          whileMatchesTargetFilter: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-030", compiled);
export default compiled;
