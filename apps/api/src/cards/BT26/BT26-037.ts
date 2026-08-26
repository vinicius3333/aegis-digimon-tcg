// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkedSource = {
  controllerDefault: "mine",
  zone: "digivolutionCards",
  hostFilter: { isSelfRef: true },
  kind: ["Digimon"],
  levels: [3],
  hasLinkRequirement: true,
  nameOrTrait: [
    { tokens: ["Navi"], match: "trait" },
    { tokens: ["System"], match: "trait" },
    { tokens: ["Seven Code"], match: "trait" },
  ],
};
const opponentDigimon = { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 };
const link = {
  kind: "Link",
  target: { filter: linkedSource, count: 1 },
  recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  from: ["digivolutionCards"],
  payCost: false,
  optional: true,
};
const battle = [
  {
    kind: "SubTrigger",
    event: "whenLinked",
    sourceFilter: { isSelfRef: true },
    actions: [
      {
        kind: "Battle",
        attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        defender: opponentDigimon,
        optional: true,
      },
    ],
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
      ],
    },
    { trigger: "OnPlay", actions: [link] },
    { trigger: "WhenDigivolving", actions: [link] },
    { trigger: "Static", isLinked: true, actions: battle },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [{ names: ["Weathermon", "Rocketmon", "Newsmon"], cost: 0 }],
  assemblyRequirement: [
    { reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] },
  ],
};

registerIrCard("BT26-037", compiled);
