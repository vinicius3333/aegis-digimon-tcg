import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Shoutmon", "Starmons"],
        },
      ],
      keywords: [{ keyword: "MaterialSave", amount: 1, raw: "＜Material Save 1＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] 1 of your opponent's Digimon gets -3000 DP for the turn.",
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if DigiXrosing with 2 cards, delete 1 of your opponent's Digimon with 2000 DP or less.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 2000 } }, count: 1 },
          condition: { kind: "digiXrosCount", minimum: 2, raw: "DigiXrosing with 2 cards" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["Shoutmon"] }, { names: ["Starmons"] }], count: 1 }],
};

registerIrCard("BT11-009", compiled);
