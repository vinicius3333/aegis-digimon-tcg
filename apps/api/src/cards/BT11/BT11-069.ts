import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "dpReductionImmunity",
          tokens: ["DeDigivolveImmunity"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["MetalGreymon", "X Antibody"], match: "nameExact" }] },
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: {
                kind: "selfHasNameContaining",
                names: ["Greymon", "Omnimon"],
                raw: "this Digimon has [Greymon] or [Omnimon] in its name",
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["MetalGreymon"], cost: 1, isAlternate: true }],
};

registerIrCard("BT11-069", compiled);
