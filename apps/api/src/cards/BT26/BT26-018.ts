// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const revealAndTrash = [
  {
    kind: "RevealAdd",
    revealCount: 3,
    add: {
      filter: { nameOrTrait: [{ tokens: ["Aqua"], match: "trait" }] },
      orFilters: [
        { nameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] },
        { nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
      ],
      count: 1,
    },
    rest: "deckBottom",
  },
  {
    kind: "TrashDigivolution",
    target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 1,
    position: "bottom",
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: revealAndTrash },
    { trigger: "OnMove", actions: revealAndTrash },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    { trigger: "Static", actions: [{ kind: "GrantTrait", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, trait: "Aquatic", duration: "permanent" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-018", compiled);
