import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-044 (Lilamon). Re-audit fixes to the generated IR:
// - "if you have [Yuuko Kamishiro] or a [CS] trait Digimon" is scoped to the battle area.
//   The zone-less default also scans the breeding area, but comprehensive rules 3-4-5-8
//   forbids referencing information on cards in breeding areas.
// - [Yuuko Kamishiro] is a printed bracket name, so it matches with `nameExact`. The
//   generated `name` mode is a substring match, which would also accept a future card whose
//   name merely contains "Yuuko Kamishiro".
// - "their effects can't return ... to hands or decks" restricts the OPPONENT's effects
//   only, so both Restrict actions carry `byOpponentEffectsOnly`. Without it the controller's
//   own return effects were blocked too.
// - "1 of your Digimon with ..." is Digimon-only. The generated Restrict target filter had no
//   `kind`, so a Tamer carrying one of the listed traits (Yuuko Kamishiro has [CS]) was offered
//   as a protection target.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 3,
              raw: "reduce the play cost by 3",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "battleArea",
                  or: [
                    {
                      kind: ["Tamer"],
                      nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "nameExact" }],
                    },
                    {
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    },
                  ],
                },
                raw: "you have [Yuuko Kamishiro] or a [CS] trait Digimon",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              kind: ["Digimon"],
              or: [
                {
                  trait: "Vegetation",
                },
                {
                  trait: "Plant",
                },
                {
                  trait: "Fairy",
                },
                {
                  trait: "CS",
                },
              ],
              controller: "mine",
            },
            count: 1,
          },
          restriction: "cannotReturnToHandOrDeck",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              kind: ["Digimon"],
              or: [
                {
                  trait: "Vegetation",
                },
                {
                  trait: "Plant",
                },
                {
                  trait: "Fairy",
                },
                {
                  trait: "CS",
                },
              ],
              controller: "mine",
            },
            count: 1,
          },
          restriction: "cannotReturnToHandOrDeck",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
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
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-044", compiled);
