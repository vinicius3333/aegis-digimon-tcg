// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX11-008 Elizamon
// Card text: [When Moving] [On Play] 1 of your Digimon with the [Reptile] or [Dragonkin] trait
// gains <Raid> and +3000 DP for the turn.
// Inherited: [Your Turn][Once Per Turn] When your opponent's security stack is removed from,
// gain 1 memory.
// Audit findings reviewed: [Main] trigger not in card text (auditor false positive).
// whenSecurityRemoved is the correct registered event name.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Reptile", "Dragonkin"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            sameTarget: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Reptile", "Dragonkin"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            sameTarget: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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
};

registerIrCard("EX11-008", compiled);
