import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          restriction: "attack",
          duration: "permanent",
          condition: {
            kind: "selfLacksInDigivolutionCards",
            filter: {
              nameOrTrait: [{ tokens: ["Gotsumon", "X Antibody"], match: "nameExact" }],
            },
            raw: "this Digimon has no [Gotsumon] or [X Antibody] name in its digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  keywords: ["Blocker"],
                },
                count: 1,
              },
              optional: true,
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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              keywords: ["Blocker"],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gotsumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-144", compiled);
