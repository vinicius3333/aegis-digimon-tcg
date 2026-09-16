import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          scope: "acrossDigimon",
          amount: 4,
          fromTop: false,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCardsCompareToSource: "gte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with as many or more digivolution cards as this Digimon",
          },
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -6000,
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Shakkoumon", "Zudomon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("LM-040", compiled);
