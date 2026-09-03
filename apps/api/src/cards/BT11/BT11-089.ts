import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Red"],
                nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Red"],
            nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
            byEffect: true,
          },
          actions: [
            {
              kind: "GainKeyword",
              target: { sourceRef: "triggerSubject", filter: { kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Rush", raw: "＜Rush＞" },
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-089", compiled);
