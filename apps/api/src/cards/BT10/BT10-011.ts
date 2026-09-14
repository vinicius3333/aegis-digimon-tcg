import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
          actions: [
            {
              effectTextPart:
                "[Your Turn][Once Per Turn] When one of your Tamers becomes suspended, this Digimon gets +2000 DP for the turn.",
              kind: "ModifyDP",
              target: self,
              amount: 2000,
              duration: "forTheTurn",
            },
            {
              effectTextPart:
                "Then, if this Digimon has 12000 DP or more, it gains ＜Security Attack +1＞ for the turn. (This Digimon checks 1 additional security card.)",
              kind: "GainKeyword",
              target: self,
              keyword: { keyword: "SecurityAttack", amount: 1 },
              duration: "forTheTurn",
              condition: { kind: "selfDpAtLeast", value: 12000 },
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: self,
          grant: "effects",
          filter: { zone: "digivolutionCards", nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: self,
          grant: "effects",
          filter: { zone: "digivolutionCards", nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Gammamon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-011", compiled);
