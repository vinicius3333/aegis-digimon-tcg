import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "MaterialSave",
          amount: 2,
          raw: "＜Material Save 2＞",
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsCompareToSource: "lte",
            },
            count: 3,
          },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digiXrosCount",
            minimum: 1,
            raw: "DigiXrosing",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Greymon"],
        },
        {
          names: ["MailBirdramon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT10-024", compiled);
