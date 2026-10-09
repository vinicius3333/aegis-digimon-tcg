import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
          bindResultAs: "familiarToken",
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              boundRef: "familiarToken",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
          bindResultAs: "familiarToken",
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              boundRef: "familiarToken",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("P-165", compiled);
