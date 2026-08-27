// @ts-nocheck
// Hand-authored override for BT4-105 (Tactical Retreat!).
// runtime-effect fix:
// - Main: SecurityManipulation placeAsSecurity source is a Digimon (not self), placed face down
//   (toTop:true, faceUp absent = false). TrashDigivolution (amount:99 = all) on that same Digimon.
// - Security: ＜Recovery +1 (Deck)＞ is a SecurityManipulation op:addTop from deck, not a keyword grant.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 99,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {},
            count: 1,
            sameTarget: true,
          },
          toTop: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          from: ["deck"],
          amount: 1,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-105", compiled);
