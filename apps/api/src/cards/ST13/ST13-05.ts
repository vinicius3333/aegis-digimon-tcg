// @ts-nocheck
// HAND-FIXED IR — source placement must happen under Durandamon itself.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          bySourceController: "mine",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: 1,
                raw: "＜Security Attack +1＞",
              },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                playCostLte: 7,
                nameOrTrait: [
                  {
                    tokens: ["Legend-Arms"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "noSecurityOptionEffects",
          duration: "permanent",
          condition: {
            kind: "selfHasName",
            names: ["RagnaLoardmon"],
            raw: "this Digimon is [RagnaLoardmon]",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST13-05", compiled);
