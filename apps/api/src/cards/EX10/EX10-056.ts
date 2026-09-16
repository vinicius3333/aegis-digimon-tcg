import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
            from: ["battleArea"],
            count: 1,
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          targetIsPermanent: true,
          position: "bottom",
          shedOwnCards: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
            from: ["battleArea"],
            count: 1,
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          targetIsPermanent: true,
          position: "bottom",
          shedOwnCards: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          oncePerTurnKey: "EX10-056/all-turns",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"], byEffect: true },
          oncePerTurnKey: "EX10-056/all-turns",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 }],
};

registerIrCard("EX10-056", compiled);

export { compiled };
export default compiled;
