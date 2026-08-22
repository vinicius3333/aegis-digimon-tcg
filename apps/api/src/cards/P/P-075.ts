// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          once: true,
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }],
          },
          actions: [
            {
              kind: "GainTriggeredEffect",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
              },
              gainedTrigger: "whenSuspended",
              gainedActions: [{ kind: "GainMemory", amount: -1 }],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-075", compiled);
