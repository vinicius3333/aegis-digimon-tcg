import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT5-111 Omnimon X (Anti-body)
// Digivolve: Your Digimon with [Omnimon] in its name → cost 3, ignore requirements.
//   names:["Omnimon"] is a SUBSTRING match (matches all "...Omnimon..." names).
// [When Attacking] Delete 1 of your opponent's Digimon with DP <= this Digimon's DP.
// [Opponent's Turn] When your opponent's Digimon attacks, you may trash 2 of THIS
//   Digimon's digivolution cards to end the attack.
//
// KB Q1387: "by" condition requires ALL actions; can't trash just 1 of the 2.
// KB Q1388: "end the attack" transitions to end-of-attack timing, skipping block+counter.
// KB Q1389: EndAttack works even against Digimon unaffected by effects.
//
// The trash cost targets self's digivolution cards (isSelfRef) and is mandatory
// (no optional:true). The SubTrigger fires on opponent attack; the cost (trash 2 self
// digivolution cards) gates the EndAttack action.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          oncePerTiming: true,
          actions: [
            {
              kind: "EndAttack",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "digivolutionCards",
                  },
                  count: 2,
                  isSelf: true,
                },
                raw: "by trashing 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Omnimon"],
      cost: 3,
      isAlternate: true,
      battleAreaOnly: true,
    },
  ],
};

registerIrCard("BT5-111", compiled);
