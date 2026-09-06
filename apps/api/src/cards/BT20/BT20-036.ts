import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["ACCEL"],
                      match: "trait",
                    },
                  ],
                },
                raw: "you have a Digimon with the [ACCEL] trait",
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
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 2,
            includeRef: "self",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Chaosmon"],
                match: "name",
              },
            ],
          },
          payCost: true,
          optional: true,
          bindResultAs: "dnaDigivolvedByThisEffect",
        },
        {
          kind: "Attack",
          // Q4345/Q4346: finish simultaneous evolution/attack triggers before Counter timing.
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              boundRef: "dnaDigivolvedByThisEffect",
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
          condition: {
            kind: "bindingExists",
            ref: "dnaDigivolvedByThisEffect",
            raw: "the DNA digivolved Digimon",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
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
      level: 5,
      traits: ["ACCEL"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-036", compiled);
