import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          fromEggDeck: true,
          asTop: true,
          optional: true,
          raw: "Among them, you may place [Mother Eater]s as this Digimon's top digivolution cards",
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "name",
                },
              ],
            },
            count: 3,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
          condition: {
            kind: "selfDigivolutionCountAtLeast",
            value: 10,
          },
          raw: "Then, if this Digimon has 10 or more digivolution cards, you may play 3 [Mother Eater]s from its digivolution cards without paying the costs",
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SetBaseDP",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "name",
                },
              ],
            },
            count: "all",
          },
          value: 16000,
          duration: "permanent",
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          // "When any of your [Eater] trait Digimon would leave the battle area other than by
          // your effects, you may place them as this Digimon's bottom digivolution cards."
          // A leave REPLACEMENT, not a post-hoc watcher: the leaving Digimon is redirected
          // under this card instead of leaving, so it must run in the wouldLeavePlay window.
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            includeToken: true,
            nameOrTrait: [
              {
                tokens: ["Eater"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: { useTriggerSource: true },
                count: 1,
              },
              targetIsPermanent: true,
              underFilter: { isSelfRef: true },
              position: "bottom",
              optional: true,
            },
          ],
          optional: true,
        },
      ],
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-007", compiled);
