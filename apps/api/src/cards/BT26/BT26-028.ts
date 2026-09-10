import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkedSource: Filter = {
  controllerDefault: "mine",
  zone: "digivolutionCards",
  hostFilter: { isSelfRef: true },
  kind: ["Digimon"],
  levels: [3],
  hasLinkRequirement: true,
  nameOrTrait: [
    { tokens: ["Life"], match: "trait" },
    { tokens: ["System"], match: "trait" },
    { tokens: ["Seven Code"], match: "trait" },
  ],
};
const opponentDigimon: Filter = { controllerDefault: "opponent", kind: ["Digimon"] };
const linkAction: Action = {
  kind: "Link",
  target: { filter: linkedSource, count: 1 },
  recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  from: ["digivolutionCards"],
  payCost: false,
  optional: true,
};
const linkingEffect: Action[] = [
  {
    kind: "SubTrigger",
    event: "whenLinked",
    sourceFilter: { isSelfRef: true },
    actions: [
      {
        kind: "SelectBind",
        target: { filter: opponentDigimon, count: 1, bindAs: "medicmonLinkedTarget" },
      },
      {
        kind: "Restrict",
        target: { filter: {}, count: 1, fromSelectionRef: "medicmonLinkedTarget" },
        restriction: "cannotActivateWhenDigivolving",
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "ModifyDP",
        target: { filter: {}, count: 1, fromSelectionRef: "medicmonLinkedTarget" },
        amount: -3000,
        duration: "untilOpponentTurnEnd",
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
        { keyword: "Barrier", raw: "＜Barrier＞" },
        { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
      ],
    },
    { trigger: "OnPlay", actions: [linkAction] },
    { trigger: "WhenDigivolving", actions: [linkAction] },
    { trigger: "Static", isLinked: true, actions: linkingEffect },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [{ names: ["Aidmon", "Supplemon", "Spamon"], cost: 0 }],
  assemblyRequirement: [
    {
      reduceCost: 2,
      materials: [{ kinds: ["Digimon"], traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }],
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT26-028", compiled);
