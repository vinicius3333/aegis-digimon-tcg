// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX3-052 (Jazarichmon).
// runtime-effect fixes:
// - [On Play] DeDigivolve: removed the separate Trash action targeting a level 3 Digimon —
//   <De-Digivolve 1> means trash 1 card from the top of the target Digimon stopping at level 3
//   (or the last card). It does NOT separately trash the Digimon itself if it reaches lv3.
//   Encoded with stopAtLevel:3 per existing engine convention (see BT15-059).
// - PlayWithoutCost for Hina Kurihara from hand is preserved.
// - Inherited [Your Turn] SecurityAttack+1 (conditional on having OnPlay effect) is preserved.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          stopAtLevel: 3,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hina Kurihara"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "selfHasOnPlayEffect",
            raw: "this Digimon has an [On Play] effect",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-052", compiled);
