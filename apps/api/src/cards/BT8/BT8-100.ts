// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const highCap = {
  kind: "anyOf",
  conditions: [
    { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], multicolor: true } },
    { kind: "youHave", filter: { zone: "digivolutionCards", controllerDefault: "mine", multicolor: true } },
  ],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "forTheTurn", condition: highCap },
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -3000, duration: "forTheTurn", condition: { kind: "not", condition: highCap } },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "forTheTurn", condition: highCap },
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -3000, duration: "forTheTurn", condition: { kind: "not", condition: highCap } },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-100", compiled);
