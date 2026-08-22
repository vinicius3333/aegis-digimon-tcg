import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: { filter: { zone: "trash", controller: "mine", hasDigiXrosRequirements: true }, count: 1, forceSelection: true },
          to: "hand",
          raw: "Return 1 card with a DigiXros requirement from your trash to your hand.",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "DigiXrosSubstitute", raw: "＜DigiXros Substitute＞" },
          duration: "forTheTurn",
          raw: "When DigiXrosing this turn, you may use this Digimon in place of one of the DigiXros requirements.",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "MaterialSave", amount: 1, raw: "＜Material Save 1＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: { kind: "raw", raw: "this Digimon has [Shoutmon] in its name" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["Shoutmon"], traits: ["Xros Heart"] }], count: 2 }],
};
const module = registerIrCard("BT10-111", compiled);

export default module;
