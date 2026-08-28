// @ts-nocheck
// HAND-FIXED IR — source placement must happen under BryweLudramon itself.
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
              kind: "GrantStatic",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              grant: "protection",
              tokens: ["beDeletedByEffects", "beReturnedToHandOrDeck"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenDigivolving",
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
      trigger: "OpponentsTurn",
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
          grant: "immuneToOpponentDigimonEffects",
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

registerIrCard("ST13-14", compiled);
