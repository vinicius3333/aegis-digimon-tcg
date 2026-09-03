import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-018 Sangomon
// Fix: [On Play] cost places self under own Digimon with Aqua/Sea Animal trait;
//   target gains <Blocker> and can't be deleted in battle until opponent's turn ends.
//   Prior IR had wrong controller (opponent), wrong duration (permanent), missing battle protection.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              boundRef: "sangomonHost",
            },
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By placing this Digimon as the bottom digivolution card of any of your other Digimon with [Aqua] or [Sea Animal] in any of their traits",
            underFilter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Aqua", "Sea Animal"],
                  match: "trait",
                },
              ],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            targetIsPermanent: true,
            bindHostAs: "sangomonHost",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beDeletedInBattle",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-018", compiled);
