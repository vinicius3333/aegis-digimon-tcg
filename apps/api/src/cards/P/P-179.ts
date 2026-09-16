import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            destination: "battleArea",
            raw: "By placing 1 Option card with the [Device] trait from your hand or trash into the battle area",
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
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 9,
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "By trashing 1 of your Option cards in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 9,
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "By trashing 1 of your Option cards in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Justimon: Blitz Arm", "Justimon: Accel Arm"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-179", compiled);
