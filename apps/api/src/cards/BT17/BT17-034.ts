// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
          condition: { kind: "securityAtLeast", value: 3 },
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardTrashedFromSecurity",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "name" }] },
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            raw: "this Digimon has [Pulsemon] in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-034", compiled);
