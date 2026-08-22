// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dm = { controller: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] };
const dmDigimon = { ...dm, kind: ["Digimon"] };
const dmLevelSix = { ...dmDigimon, levelLte: 6 };

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
      actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { controller: "mine", kind: ["Digimon"] }, addedDigivolutionCardFilter: { faceDown: true }, raw: "When face-down cards are placed under one of your Digimon, ＜Delay＞: that Digimon may digivolve into a level 6 or lower DM Digimon from hand without paying the cost.", actions: [
        { kind: "Digivolve", target: { filter: { useTriggerSource: true }, count: 1 }, into: dmLevelSix, from: ["hand"], payCost: false, optional: true },
      ] }],
    },
    { trigger: "Security", isSecurity: true, actions: [
      { kind: "RevealAdd", revealCount: 3, add: { filter: dm, count: 1, to: "hand", optional: true }, rest: "deckBottom" },
      { kind: "PlaceInBattleAreaSelf" },
    ] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-099", compiled);
