import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The [All Turns] clause is gated by "While your opponent has a Digimon with 13000 DP or more".
// `ModifyDPAction` / `GrantImmunityAction` carry no `while` field; the shared per-action gate in
// `runAction` reads `action.condition ?? action.while`, so `condition` is the typed spelling of
// exactly the same gate. Both actions are re-resolved on every continuous pass, which is what
// KB Q5026 requires: the moment the 13000+ DP Digimon leaves, the grant lapses.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 7,
            },
            count: 1,
          },
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
              kind: ["Digimon", "Tamer"],
              playCostLte: 7,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "permanent",
          condition: {
            kind: "opponentHas",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "gte",
                value: 13000,
              },
            },
            raw: "your opponent has a Digimon with 13000 DP or more",
          },
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          immuneFrom: "opponentDigimonEffects",
          duration: "permanent",
          condition: {
            kind: "opponentHas",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "gte",
                value: 13000,
              },
            },
            raw: "your opponent has a Digimon with 13000 DP or more",
          },
          raw: "your opponent's Digimon's effects don't affect this Digimon",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-010", compiled);
