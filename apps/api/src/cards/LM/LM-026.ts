import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } as const;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: self,
          optional: true,
          playAndRelocateSourceUnder: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] },
            from: ["digivolutionCards", "trash"],
          },
          raw: "play 1 Guilmon and place this Digimon as its bottom digivolution card",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", target: self, grant: "name", tokens: ["ChaosGallantmon"] }],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "DeletionMaxDpModifier", amount: 5000, scope: "self", duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, names: ["Growlmon"], cost: 3, isAlternate: true }],
};

registerIrCard("LM-026", compiled);
