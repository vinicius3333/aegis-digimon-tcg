import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] ＜Recovery +1 (Deck)＞. Then, if DNA digivolving, by placing 1 other Digimon or Tamer as the top or bottom security card, trash your opponent's top security card.",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] ＜Recovery +1 (Deck)＞. Then, if DNA digivolving, by placing 1 other Digimon or Tamer as the top or bottom security card, trash your opponent's top security card.",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                controller: "any",
                excludeSelf: true,
                kind: ["Digimon", "Tamer"],
                zone: "battleArea",
              },
              count: 1,
            },
            destination: "security",
            position: "choice",
            raw: "by placing 1 other Digimon or Tamer as the top or bottom security card",
          },
          optional: true,
          abortOnDecline: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card, you may play 1 purple or yellow Digimon card with 6000 DP or less from your hand or trash without paying the cost.",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "trashSecurityPlayDigimon",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "trashSecurityPlayDigimon",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-187", compiled);
