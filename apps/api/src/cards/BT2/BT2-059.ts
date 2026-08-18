// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT2-059 Kurisarimon (inherited):
// [Your Turn] When you play another Digimon with the same name as this Digimon,
//   gain 1 memory.
// KB Q1024: "this Digimon" = the Digimon this card digivolves into (the host's top card).
// KB Q2814: tokens played simultaneously only trigger once.
// Requires engine support: sourceFilter.nameMatchesInheritedHost:true to match
// the played Digimon's name against the host permanent's top card name dynamically.
// See LANE_G.md.

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
            nameMatchesInheritedHost: true,
          },
          oncePerTiming: true,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-059", compiled);
