// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST18-12 Zephagamon — hand-fixed IR.
// <Vortex> (At the end of your turn, this Digimon may attack an opponent's Digimon.
//   With this effect, it can attack the turn it was played.)
// [When Digivolving] Suspend 1 Digimon. Then, unsuspend 1 Digimon.
// [All Turns][Once Per Turn] When a Digimon is unsuspended, this Digimon is unaffected
//   by your opponent's Digimon's effects, and gets +3000 DP for the turn.
// [Rule] Trait: Has the [Bird Dragon] type.
//
// KB Q848: Either player's Digimon can be targeted for suspend AND unsuspend.
// KB Q849: [All Turns] effect triggers when EITHER player's Digimon is unsuspended.
//
// "Unaffected by opponent's Digimon's effects" = Restrict(self, "beAffected", forTheTurn).
// Note: "beAffected" restriction covers all opponent effects; text specifies only
//   The interpreter's source-kind-qualified restriction represents the printed
//   "Digimon's effects" scope exactly.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Vortex",
          raw: "＜Vortex＞",
        },
      ],
    },
    {
      // [When Digivolving] Suspend 1 Digimon. Then, unsuspend 1 Digimon.
      // KB Q848: either player's Digimon can be targeted for both actions.
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      // [All Turns][Once Per Turn] When a Digimon is unsuspended, this Digimon is
      // unaffected by your opponent's Digimon's effects, and gets +3000 DP for the turn.
      // KB Q849: fires for EITHER player's Digimon being unsuspended.
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              restriction: "beAffected",
              byOpponentEffectsOnly: true,
              fromSourceKind: ["Digimon"],
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Bird Dragon"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST18-12", compiled);
