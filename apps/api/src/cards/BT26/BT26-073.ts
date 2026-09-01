// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLevelFive = {
  controllerDefault: "opponent",
  kind: ["Digimon"],
  levelComparison: { op: "lte", value: 5 },
};
const shamanOrTsTrash = {
  controllerDefault: "mine",
  zone: "trash",
  nameOrTrait: [
    { tokens: ["Shaman"], match: "trait" },
    { tokens: ["TS"], match: "trait" },
  ],
};
const tsPlayable = {
  controllerDefault: "mine",
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
  playCostLte: 5,
};

const deleteOpponent = { kind: "Delete", target: { filter: opponentLevelFive, count: 1 } };
const costChoice = {
  kind: "Modal",
  choose: 1,
  optional: true,
  abortOnDecline: true,
  options: [
    [{ ...deleteOpponent, cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1 } } }],
    [{ ...deleteOpponent, cost: { kind: "return", target: { filter: shamanOrTsTrash, count: 1 }, to: "deckBottom" } }],
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", sharedUseKey: "on-play-cost-delete", actions: [costChoice] },
    { trigger: "WhenDigivolving", sharedUseKey: "when-digivolving-cost-delete", actions: [costChoice] },
    {
      trigger: "OnDeletion",
      sharedUseKey: "on-deletion-play-ts",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: tsPlayable, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      sharedUseKey: "inherited-security-attack",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }],
    },
    {
      trigger: "Static",
      sharedUseKey: "rule-wizard-trait",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Wizard"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Aegiomon"], cost: 3, isAlternate: true }],
  assemblyRequirement: [
    {
      reduceCost: 2,
      materials: [
        {
          levelMax: 4,
          nameOrTrait: [
            { tokens: ["Chronomon"], match: "text" },
            { tokens: ["TS"], match: "trait" },
          ],
          count: 1,
        },
      ],
    },
  ],
};

registerIrCard("BT26-073", compiled);
