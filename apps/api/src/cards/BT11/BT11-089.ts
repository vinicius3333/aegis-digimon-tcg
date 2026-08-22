import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Red"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] }, count: 1, to: "hand" }],
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
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Red"], nameOrTrait: [{ tokens: ["Avian"], match: "trait" }] },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controllerDefault: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Bird", "Beast", "Animal"], match: "trait" }, { tokens: ["Sovereign"], match: "trait" }] }, count: 1 },
              keyword: { keyword: "Rush", raw: "＜Rush＞" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-089", compiled);
