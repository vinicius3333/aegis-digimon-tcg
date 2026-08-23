// @ts-nocheck
// Hand-preserved override (not generator-owned): identical IR to what
// runtime effect records currently emits for EX6-044, but `compiled` is exported
// because EX6-044.test.ts imports it directly (`import { compiled as EX6_044 }`).
// `export` on this const, so a plain regeneration would silently break that test.
// Keep this file in sync with the effects.json entry for EX6-044 by hand.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: {
                attr: "dp",
                op: "lte",
                selectionRef: "digivolveHost",
              },
            },
            count: "all",
          },
          amount: 1,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              from: ["hand"],
            },
            host: "target",
            underFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levels: [6],
                },
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  traits: ["Legend-Arms"],
                },
              ],
            },
            position: "bottom",
            bindHostAs: "digivolveHost",
            raw: "By placing this card as the bottom digivolution card of 1 of your Digimon that's level 6 or has the [Legend-Arms] trait",
          },
          additionalCost: {
            kind: "payMemory",
            memory: 3,
            raw: "By paying 3 cost",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "Static",
      actions: [
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
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
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
            keyword: "Reboot",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "immuneToOpponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
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
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      isInherited: true,
      keywords: [],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["RagnaLoardmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          leaveCause: "otherThanYourEffect",
          exceptDeletion: true,
          optional: false,
          raw: "[RagnaLoardmon] can't leave the battle area other than by your effects or by deletion",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-044", compiled);
