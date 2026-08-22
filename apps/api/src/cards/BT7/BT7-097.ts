// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playFromStack = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controller: "mine",
      zone: "digivolutionCards",
      kind: ["Digimon"],
      hostFilter: { controller: "mine", kind: ["Digimon"] },
    },
    count: 2,
    upTo: true,
  },
  from: ["digivolutionCards"],
  payCost: false,
  suspended: false,
  raw: "Play up to 2 Digimon cards from one of your Digimon's digivolution cards without paying their memory costs.",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [playFromStack] },
    { trigger: "Security", isSecurity: true, actions: [playFromStack] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-097", compiled);
