import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          raw: "At the end of the battle, add this card to your hand. Then, if a Royal Knight or X-Antibody Digimon is in play, up to 12 opponent Digimon can't attack players for the turn.",
          actions: [
            {
              kind: "AddToHandSelf",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 12,
                upTo: true,
              },
              restriction: "attackPlayers",
              duration: "forTheTurn",
              condition: {
                kind: "youHave",
                filter: {
                  controller: "any",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Royal Knight", "X-Antibody"],
                      match: "trait",
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PayMemoryUpTo",
          maxMemory: 5,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "forTheTurn",
          optional: true,
          condition: {
            kind: "triggerAttackerIsSelf",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "triggerAttackerIsSelf",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-111", compiled);
