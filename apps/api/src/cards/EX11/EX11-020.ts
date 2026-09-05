import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) OnDeletion: condition "deleted other than in battle" — kept as raw; engine
//     evaluates via trigger context (OnDeletion fires, battle flag filters it).
// (2) Inherited SubTrigger whenOpponentAttacks: added EndAttack to actions[] —
//     text says "end that attack"; was missing (empty array). Cost is deleteOwn;
//     if cost cannot be paid (no other Digimon), the EndAttack does not happen
//     (cost-gating is standard interpreter behavior).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Shoemon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "not",
            condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
            raw: "deleted other than in battle",
          },
          optional: true,
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
              kind: "EndAttack",
            },
          ],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "by deleting 1 of your other Digimon, end that attack",
          },
          optional: true,
          abortOnDecline: true,
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
      namesExact: ["Kyaromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-020", compiled);
