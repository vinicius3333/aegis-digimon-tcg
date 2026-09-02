import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX10-057 (the AUTO-GENERATED header is absent on purpose so
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
      // KB Q5155/Q5739-Q5740 (the delete still applies after the played card digivolves,
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
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      // "[All Turns] This Digimon can only digivolve into [Apocalymon]."
      //
      // Hand-corrected: this was a `kind: "Restrict"` node carrying `on: "digivolveTarget"` (a
      // string where `RestrictAction.on` is a `Target`) plus a top-level `filter`, and NO
      // `restriction` / `duration`. None of those three fields is read for that action kind, so
      // the clause was entirely dead — the Digimon could digivolve into anything. The engine
      // already owns the exact primitive: `RestrictDigivolveInto` is the POSITIVE digivolve-target
      // constraint, proven by this card's sibling EX10-035 (same printed wording).
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
              colors: ["Purple"],
            },
            raw: "you have no purple face-up security cards",
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

registerIrCard("EX10-057", compiled);

export { compiled };
