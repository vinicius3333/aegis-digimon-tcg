import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "instead",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
          },
          into: {
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
              raw: "[All Turns] When this Digimon becomes suspended, lose 1 memory.",
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
