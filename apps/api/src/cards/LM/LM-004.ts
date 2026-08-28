import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } as const;
const trashTwoBlue = {
  kind: "trash" as const,
  target: { filter: { zone: "hand" as const, controller: "mine" as const, colors: ["Blue" as const] }, count: 2 },
  raw: "By trashing 2 blue cards in your hand",
};
const entranceActions = [
  {
    kind: "Unsuspend" as const,
    target: { filter: { controller: "mine" as const, kind: ["Digimon" as const], suspended: true }, count: 1 },
    cost: trashTwoBlue,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "Unsuspend" as const,
    target: {
      filter: {
        controller: "mine" as const,
        kind: ["Tamer" as const],
        suspended: true,
        nameOrTrait: [{ tokens: ["Kiyoshiro Higashimitarai"], match: "name" as const }],
      },
      count: 1,
    },
  },
  {
    kind: "GainKeyword" as const,
    target: self,
    keyword: { keyword: "Blocker" as const, raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd" as const,
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: entranceActions },
    { trigger: "WhenDigivolving", actions: entranceActions },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          raw: "when a card with Jellymon in its text is trashed from your hand",
          sourceFilter: { nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }] },
          actions: [{ kind: "Unsuspend", target: self, optional: true }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-004", compiled);
