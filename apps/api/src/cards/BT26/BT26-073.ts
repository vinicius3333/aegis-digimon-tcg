// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLevelFive = { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } };
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
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
  playCostLte: 5,
};

const deleteOpponent = { kind: "Delete", target: { filter: opponentLevelFive, count: 1 } };
const costChoice = {
  kind: "Modal",
  choose: 1,
  options: [
    [{ ...deleteOpponent, cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1 } } }],
    [{ ...deleteOpponent, cost: { kind: "return", target: { filter: shamanOrTsTrash, count: 1 }, to: "deckBottom" } }],
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [costChoice] },
    { trigger: "WhenDigivolving", actions: [costChoice] },
    {
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", target: { filter: tsPlayable, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true }],
    },
    {
      trigger: "Static",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "permanent" }],
    },
    {
      trigger: "Static",
      actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "trait", tokens: ["Wizard"], duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-073", compiled);
