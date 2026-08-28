// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5142-Q5148/Q5166-Q5167: exact two-card payment, opponent-only digivolve/
// placement events, and no trigger from linking. The shared watcher key is
// applied to both event forms so they consume one physical once-per-turn use.
const watcherActions = [
  {
    kind: "trashSecurityTop",
    controller: "opponent",
    count: 1,
    cost: {
      kind: "trash",
      target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
      raw: "By trashing any 2 of this Digimon's digivolution cards",
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
            from: ["battleArea"],
            count: 1,
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"], excludeSelf: true },
          targetIsPermanent: true,
          position: "bottom",
          optional: true,
        },
      ],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: watcherActions,
          oncePerTurnKey: "EX10-056/all-turns",
        },
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          actions: watcherActions,
          oncePerTurnKey: "EX10-056/all-turns",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, colors: ["Purple"], cost: 5 }],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }],
};

registerIrCard("EX10-056", compiled);
export default compiled;
