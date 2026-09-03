import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              excludeNames: ["Sephirothmon"],
              controller: "mine",
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
        {
          kind: "ActivateEffect",
          target: { filter: { controller: "mine", zone: "digivolutionCards" }, count: 1 },
          effectType: "OnPlay",
          lastPlacedOnly: true,
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
              excludeNames: ["Sephirothmon"],
              controller: "mine",
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
        {
          kind: "ActivateEffect",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
              zone: "digivolutionCards",
            },
            count: 1,
          },
          effectType: "OnPlay",
          lastPlacedOnly: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Mercurymon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-066", compiled);
