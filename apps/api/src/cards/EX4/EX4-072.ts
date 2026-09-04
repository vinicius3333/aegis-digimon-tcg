// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Plug-In"],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levels: [6],
              nameOrTrait: [{ tokens: ["Gallantmon", "Sakuyamon", "MegaGargomon"], match: "name" }],
            },
            count: 1,
            bindAs: "chosenBase",
          },
          into: { controllerDefault: "mine", kind: ["Digimon"], levels: [6] },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          nameIncludesDigivolvingTarget: true,
          differentNameFromDigivolvingTarget: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "Return",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1 },
          to: "hand",
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-072", compiled);
export default compiled;
