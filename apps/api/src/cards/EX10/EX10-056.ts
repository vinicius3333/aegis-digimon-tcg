// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5142-Q5148/Q5166-Q5167: exact two-card payment, opponent-only digivolve/
// placement events, and no trigger from linking. Two engine seams remain
// explicit: cross-event shared once-per-turn identity and top-Security trash.
const watcherActions = [
  {
    kind: "RawUnparsed",
    text: "missing-primitive(unaudited): trash opponent's top security card",
    cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 }, raw: "By trashing any 2 of this Digimon's digivolution cards" },
  },
];

const compiled: CompiledCard = {
  effects: [
    ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
      trigger,
      actions: [{
        kind: "PlaceUnder",
        target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, from: ["battleArea"], count: 1 },
        underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"], excludeSelf: true },
        position: "bottom",
        optional: true,
      }],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: watcherActions },
        { kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, actions: watcherActions },
      ],
    },
  ],
  coverage: "partial",
  residual: [
    "Cross-event once-per-turn identity is not proven by the current SubTrigger model.",
    "The compiled action set has no faithful opponent-top-Security trash primitive.",
  ],
  digivolutionRequirement: [{ level: 5, colors: ["Purple"], cost: 5 }],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }],
};

registerIrCard("EX10-056", compiled);
export default compiled;
