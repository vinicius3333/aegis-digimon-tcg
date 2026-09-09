import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          // `whenAttacking` reads the attacking subject through `triggerFilter`
          // (SUBJECT_TRIGGER_FILTER_EVENTS); a `sourceFilter` here is never consumed.
          triggerFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                sourceRef: "triggerDefender",
                filter: {},
                count: 1,
              },
              // The declared defender is only known when the watcher FIRES; a condition on the
              // SubTrigger action itself is evaluated while the watcher is being installed, when
              // the trigger payload carries no defender.
              condition: {
                kind: "attackTargetMatchesFilter",
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasNone",
                },
                raw: "when this Digimon attacks an opponent's Digimon with no digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      // Printed "[Digivolve][Patamon]" is an EXACT name, not a substring: `names` would also
      // accept any future source whose name merely contains "Patamon".
      namesExact: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-064", compiled);
