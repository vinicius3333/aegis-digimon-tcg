import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          effectTextPart: "[When Attacking] Trash any 1 digivolution card of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
        },
        {
          effectTextPart:
            "Then, 1 of their Digimon with no digivolution cards gains <Security A. -1> until the end of their turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-022", compiled);
export { compiled };
