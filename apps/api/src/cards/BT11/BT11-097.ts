import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 } },
        {
          kind: "ActivateEffect",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Red"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] }, count: 1 },
          effectType: "OnDeletion",
          count: 1,
          condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red"] }, raw: "you have a red Tamer in play" },
          optional: true,
          useLenderAsSource: true,
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-097", compiled);
