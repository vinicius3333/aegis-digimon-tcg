// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkCount = { per: 1, unit: "linkCards", filter: { isSelfRef: true } };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-073/security-attack",
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-073/blocker",
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-073/link-max",
      keywords: [{ keyword: "LinkMax", amount: 2, raw: "＜Link +2＞" }],
    },
    {
      trigger: "WhenDigivolving",
      effectKey: "EX11-073/when-digivolving-link-maquinamon",
      optional: true,
      actions: [
        {
          kind: "Link",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] },
            count: 3,
            upTo: true,
          },
          from: ["hand", "trash", "digivolutionCards"],
          payCost: false,
          optional: true,
          condition: { kind: "isDnaDigivolving", raw: "if DNA digivolving" },
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      effectKey: "EX11-073/end-opponents-turn-link-payoff",
      actions: [
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, scaling: linkCount },
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          to: "deckBottom",
          scaling: linkCount,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("EX11-073", compiled);
