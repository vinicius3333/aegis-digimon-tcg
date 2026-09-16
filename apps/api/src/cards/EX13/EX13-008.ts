import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const revealAddDracomonOrExamon = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
      },
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [revealAddDracomonOrExamon()],
    },
    {
      trigger: "OnPlay",
      actions: [revealAddDracomonOrExamon()],
    },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              includesSelf: true,
            },
            count: 2,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            zone: "hand",
          },
          payCost: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Bebydomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX13-008", compiled);
