import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const xrosHeartPlayedUseKey = "bt19-035-xros-heart-played";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
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
          grant: "name",
          tokens: ["Starmons"],
          digiXrosOnly: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Xros Heart"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security Attack -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              amount: -3000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: xrosHeartPlayedUseKey,
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart", "Blue Flare"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "forTheTurn",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] },
            raw: "this Digimon has the [Xros Heart] trait",
          },
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
      level: 3,
      traits: ["Xros Heart"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-035", compiled);
