import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] This Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if this Digimon has [MetalGreymon] or [X Antibody] in its digivolution cards, this Digimon gets +3000 DP until the end of your opponent’s next turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentNextTurnEnd",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              {
                tokens: ["MetalGreymon", "X Antibody"],
                match: "nameExact",
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["MetalGreymon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-015", compiled);
