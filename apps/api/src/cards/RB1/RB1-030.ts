import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * RB1-030 — Canoweissmon (RB1 Purple Digimon).
 *
 * 1. [None] Digivolution Requirement: Lv.4 Gammamon, cost 3 (documented behavior).
 * 2. [When Digivolving] [Once Per Turn] OR [When Attacking] [Once Per Turn]:
 *    By trashing 1 card with [Gammamon] in its TEXT from hand, 1 of your Digimon
 *    gains "[On Deletion] Delete 1 of your opponent's Digimon with the lowest level"
 *    until the end of your opponent's turn.
 *    The trash-from-hand cost with text filter is faithfully expressed via
 *    GrantStatic.cost.kind:"trash" with nameOrTrait:{match:"text"}.
 * 3. [All Turns] (non-inherited) Gains all effects of [Gammamon] in digivolution cards
 *    (documented behavior rule implementation).
 * 4. [All Turns] (inherited) Same as above but inherited (documented behavior).
 *
 * FIXED: Trash-from-hand cost with Gammamon-text filter on GrantStatic (documented behavior).
 * The inherited Gammamon conferStackEffects pass is modeled via two separate GrantStatic blocks
 * (non-inherited + inherited). The granted "[On Deletion] Delete lowest-LEVEL opponent Digimon"
 * is now a real grant: GrantStatic grant:"effects" + tokens:["OnDeletionDeleteLowest"] installs a
 * duration-scoped (UntilOpponentTurnEnd) custom-effect grant on the chosen Digimon, and the
 * effect-collector compiles the token to an [On Deletion] effect anchored on that Digimon — so it
 * fires through the SAME OnDestroyedAnyone window as a printed [On Deletion] and deletes the
 */

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
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
          grant: "effects",
          tokens: ["OnDeletionDeleteLowest"],
          duration: "untilOpponentTurnEnd",
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
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
          grant: "effects",
          tokens: ["OnDeletionDeleteLowest"],
          duration: "untilOpponentTurnEnd",
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          filter: {
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          filter: {
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Gammamon"],
      cost: 3,
      isAlternate: false,
    },
  ],
};

registerIrCard("RB1-030", compiled);
