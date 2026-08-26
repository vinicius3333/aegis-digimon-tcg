// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["OmniShoutmon", "ZeigGreymon"],
        },
      ],
      keywords: [{ keyword: "MaterialSave", amount: 2, raw: "＜Material Save 2＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "deleteOwn",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By deleting this Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }], count: 3 }],
};

registerIrCard("BT11-018", compiled);
