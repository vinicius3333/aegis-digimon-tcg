import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type Actions = CompiledCard["effects"][number]["actions"];

const marcusTarget = {
  filter: {
    controller: "mine" as const,
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" as const }],
  },
  count: 1 as const,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        { kind: "GrantStatic", target: marcusTarget, grant: "kinds", tokens: ["Digimon"], duration: "forTheTurn" },
        { kind: "SetBaseDP", target: marcusTarget, value: 3000, duration: "forTheTurn" },
        { kind: "Restrict", target: marcusTarget, restriction: "digivolve", duration: "forTheTurn" },
      ] as unknown as Actions,
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
              target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
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
