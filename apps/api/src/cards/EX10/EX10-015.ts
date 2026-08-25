// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5044/Q5045: Save is matched in card text; choosing to pay the hand-trash
// processing condition gates both Draw 1 and the opposing Digimon suspension.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand", textContains: "Save" }, count: 1 },
            raw: "By trashing 1 card with ＜Save＞ in its text from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 2, colors: ["Green"], cost: 1 },
    { level: 2, colors: ["Purple"], cost: 1 },
  ],
  digiXrosRequirement: [
    {
      materials: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Save"], match: "text" }] }],
      count: 2,
    },
  ],
};

registerIrCard("EX10-015", compiled);
export default compiled;
