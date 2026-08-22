import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1, bindAs: "chosenHost" } },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { zone: "digivolutionCards", controller: "mine", kind: ["Digimon"], hostFilter: { boundRef: "chosenHost" } },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST2-15", compiled);
