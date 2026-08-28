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
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              excludeNames: ["Bokomon"],
              nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by deleting this Digimon",
          },
          optional: true,
          raw: "prevent that Digimon from leaving",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-019", compiled);
