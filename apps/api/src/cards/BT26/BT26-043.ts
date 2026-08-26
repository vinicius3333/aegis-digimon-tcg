// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTarget = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 };
const setup = [
  { kind: "Suspend", target: opponentTarget },
  // "your deck's top card" is taken with no prompt. A loose `from: ["deck"]` target would
  // instead offer the whole deck for selection.
  {
    kind: "PlaceUnder",
    fromDeckTop: true,
    target: { filter: {}, count: 1 },
    underFilter: { isSelfRef: true },
    position: "bottom",
    faceDown: true,
  },
  {
    kind: "Restrict",
    target: opponentTarget,
    restriction: "unsuspend",
    duration: "untilOpponentTurnEnd",
    scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 },
  },
];
export const compiled: CompiledCard = {
  keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
  effects: [
    { trigger: "OnPlay", actions: setup },
    { trigger: "WhenDigivolving", actions: setup },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DM"], cost: 3, isAlternate: true }],
};
registerIrCard("BT26-043", compiled);
export default compiled;
