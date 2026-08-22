// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dm = { controller: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] };
const dmDigimon = { ...dm, kind: ["Digimon"] };
const dmLevelSix = { ...dmDigimon, level: { op: "lte", value: 6 } };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "RevealAdd", revealCount: 3, add: { filter: dm, count: 1, to: "hand", optional: true }, rest: "deckBottom" },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [
        { kind: "Digivolve", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, into: dmLevelSix, from: ["hand"], payCost: false, optional: true },
      ] }],
    },
    { trigger: "Security", isSecurity: true, actions: [
      { kind: "RevealAdd", revealCount: 3, add: { filter: dm, count: 1, to: "hand", optional: true }, rest: "deckBottom" },
      { kind: "PlaceInBattleAreaSelf" },
    ] },
  ],
  coverage: "partial",
  residual: ["Delay self-trash activation cost and cannot-activate-the-entry-turn guard are not expressible in the current SubTrigger IR."],
};

registerIrCard("BT26-099", compiled);
