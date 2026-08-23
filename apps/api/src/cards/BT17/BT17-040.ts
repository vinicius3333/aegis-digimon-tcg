// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GainKeyword",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "name" }] },
            raw: "[Leon Alexander] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -6000,
          duration: "forTheTurn",
          condition: { kind: "securityAtLeast", value: 3 },
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
          amount: 1,
        },
        { kind: "Attack", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, optional: true },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -8000,
              duration: "forTheTurn",
              condition: {
                kind: "selfHasNameContaining",
                names: ["Fenriloogamon"],
                raw: "this Digimon has [Fenriloogamon] in its name",
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
};

registerIrCard("BT17-040", compiled);
