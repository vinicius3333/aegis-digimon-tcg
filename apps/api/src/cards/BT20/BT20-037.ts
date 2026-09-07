import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: For each level 6 digivolution card, suspend 1 opponent Digimon/Tamer
// and gain 1 memory. All opponent Digimon and Tamers can't activate [On Play] effects
// or unsuspend until end of their turn.
export const compiled: CompiledCard = {
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
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition (Yellow Lv.6 + Green/Black Lv.6)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levels: [6],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levels: [6],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "DisableTimingEffect",
          whileMatchesTargetFilter: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          timings: ["onPlay"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          whileMatchesTargetFilter: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-037", compiled);
