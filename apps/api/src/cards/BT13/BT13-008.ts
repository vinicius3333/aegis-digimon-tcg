import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const marcusTarget = {
  filter: {
    controller: "mine" as const,
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" as const }],
  },
  count: 1 as const,
  bindAs: "chosenMarcus",
} satisfies Target;

const chosenMarcusTarget = {
  filter: {},
  count: 1,
  fromSelectionRef: "chosenMarcus",
} satisfies Target;

const becomeDigimonActions = [
  { kind: "SelectBind", target: marcusTarget },
  { kind: "GrantStatic", target: chosenMarcusTarget, grant: "kinds", tokens: ["Digimon"], duration: "forTheTurn" },
  { kind: "SetBaseDP", target: chosenMarcusTarget, value: 3000, duration: "forTheTurn" },
  { kind: "Restrict", target: chosenMarcusTarget, restriction: "digivolve", duration: "forTheTurn" },
] satisfies Action[];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      effectKey: "BT13-008/become-digimon",
      frequency: "OncePerTurn",
      actions: becomeDigimonActions,
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Koromon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT13-008", compiled);
