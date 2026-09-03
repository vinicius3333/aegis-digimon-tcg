import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "MaterialSave", amount: 4, raw: "＜Material Save 4＞" },
          duration: "permanent",
        },
      ],
      keywords: [{ keyword: "Rush", raw: "＜Rush＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
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
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
          scaling: { per: 2, filter: { controllerDefault: "mine" }, unit: "digivolutionCards" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: ["OmniShoutmon", "ZeigGreymon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map((names) => ({
        names: [names],
      })),
      count: 2,
    },
  ],
};

registerIrCard("BT11-019", compiled);
