// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [AllTurns]: RestrictDigivolveInto (not generic Restrict) — text says "can only digivolve into [Apocalymon]".
// [OnDeletion]: condition "no green face-up security cards" needs zone:security + faceUp:true on filter.
// [Security]: "if this card was face-up" — raw condition kept (EX10-035 precedent).
const compiled: CompiledCard = {
  effects: [
    {
      // Hand-corrected (dead-IR sweep): the printed [Hand][Main] clause is an ACTIVATED effect
      // that plays THIS card from hand for its play cost minus 5 and arms a turn-end delete on
      // the permanent it just played — the same shape as its proven sibling EX10-035 (see
      // EX10-035.test.ts). The declarative effect record modelled it as a bare wouldBePlayed cost-reduction
      // Replacement plus a SubTrigger whose Delete carried the never-read `playedByThisEffect`
      // filter, so nothing played the card and the turn-end Delete matched every permanent.
      // UntilOwnerTurnEndEffects + OnEndTurn gated on IsOwnerTurn => `DelayedDeletePlayed`.
      // KB Q5732/Q5733 (and Q5036: the delete still applies after the played card digivolves,
      // which the permanent-anchored watcher honors).
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHaveNone",
        filter: {
          kind: ["Digimon"],
          excludeNameOrTrait: [
            {
              tokens: ["Dark Masters"],
              match: "any",
            },
          ],
        },
        raw: "you don't have any Digimon other than Digimon with [Dark Masters] in their texts",
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 5,
          raw: "play this card with the play cost reduced by 5",
        },
        {
          kind: "DelayedDeletePlayed",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
      optional: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            nameOrTrait: [
              {
                tokens: ["Apocalymon"],
                match: "name",
              },
            ],
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              zone: "security",
              faceUp: true,
              colors: ["Green"],
            },
            raw: "you have no green face-up security cards",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          condition: {
            kind: "sourceWasFaceUpSecurity",
            raw: "this card was face-up",
          },
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-020", compiled);
