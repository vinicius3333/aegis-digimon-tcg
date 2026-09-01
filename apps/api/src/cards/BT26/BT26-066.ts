// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const titan = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] };
const trashTitan = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
};
const startDigivolve = {
  kind: "Digivolve",
  target: { filter: titan, count: 1 },
  into: trashTitan,
  from: ["trash"],
  payCost: true,
  useAlternateCost: true,
  costDelta: -2,
  optional: true,
  condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 },
};
const inheritedDigivolve = {
  kind: "Digivolve",
  target: {
    filter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
    count: 1,
    isSelf: true,
  },
  into: {
    controllerDefault: "mine",
    zone: "trash",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Titamon"], match: "nameExact" },
      { tokens: ["Titan"], match: "trait" },
    ],
  },
  from: ["trash"],
  payCost: true,
  useAlternateCost: true,
  costDelta: -1,
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [startDigivolve] },
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [inheritedDigivolve],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }],
};

registerIrCard("BT26-066", compiled);
