// @ts-nocheck
// Hand-authored override for LM-006.
// runtime-effect fix: "none of their Digimon with no digivolution cards can attack" restricts
// EVERY such opponent Digimon, not a single chosen one. Changed both Restrict targets
// from count:1 to count:"all".
// Audit fix (LM audit): the [Trash][Main] clause PLAYS this card from the trash at a reduced
// cost. It compiled to a bare `ReducePlayCost` with no `payment` and no play verb, which the
// interpreter drops outright, so the clause did nothing. Rebuild it on BT24-076's shape —
// PlayWithoutCost from trash with payCost — and take the reduction from the returned Tamer's
// printed play cost, recorded by the return cost's `storeAsPlayCost` receipt.
// Audit fix (LM audit): Q3996 makes the attack lock a LIVE predicate — a Digimon that gains
// digivolution cards afterwards may attack again — so the Restrict installs as a player-scoped
// dynamic filter (`whileMatchesTargetFilter`), not a snapshot of the ids matching at resolution.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
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
          from: ["trash"],
          payCost: true,
          reduceCostByScaling: {
            per: 1,
            unit: "namedCount",
            countSource: "returnedTamerPlayCost",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
              },
              count: 1,
            },
            to: "deckBottom",
            storeAsPlayCost: "returnedTamerPlayCost",
            raw: "By returning 1 of your Tamers to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
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
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-006", compiled);
