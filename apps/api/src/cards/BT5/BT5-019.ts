import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [], keywords: [{ keyword: "Blitz", raw: "＜Blitz＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Red"] }, count: 1 },
          from: ["hand"],
          asTop: true,
          optional: true,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
          scaling: {
            per: 1,
            unit: "digivolutionCards",
            filter: { nameOrTrait: [{ tokens: ["OmniShoutmon", "ZeigGreymon"], match: "nameExact" }] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-019", compiled);
