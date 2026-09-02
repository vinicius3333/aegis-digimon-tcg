import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-064 Megadramon.
// Q6862: the delete is mandatory — with a legal level 4 or lower target the controller must
// choose and delete it, so the Delete action carries no `optional`.
// Q6863: choosing a deletion-immune target still satisfies "if this effect didn't delete", which
// is exactly what `ifThisEffectDidNotDelete` encodes (an immune or prevented target counts as
// not deleted).
// Q6864: the [All Turns] watcher also fires for this card's own play; Megadramon carries the
// [Cyborg] and [ME] traits, so its `sourceFilter` matches the card that installed the watcher.
// The shared delete/De-Digivolve pair is annotated `Action[]` (the EX12-052 convention). Without
// the annotation TypeScript widened every `kind` to `string`, so neither `[On Play]` nor
// `[When Digivolving]` conformed to `CardEffect.actions` — the two reported type errors.
const deleteOrDeDigivolve: Action[] = [
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        levelComparison: { op: "lte", value: 4 },
      },
      count: 1,
    },
  },
  {
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 1,
    condition: {
      kind: "ifThisEffectDidNotDelete",
      raw: "if this effect didn't delete a Digimon",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: deleteOrDeDigivolve,
    },
    {
      trigger: "WhenDigivolving",
      actions: deleteOrDeDigivolve,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Machine", "Cyborg", "ME"], match: "trait" }],
          },
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
          cost: {
            kind: "unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By unsuspending this Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Machine", "ME"],
      cost: 3,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      reduceCost: 2,
      materials: [{ count: 1, traits: ["Machine", "Cyborg", "ME"], levelMax: 4 }],
    },
  ],
};

registerIrCard("EX12-064", compiled);
