// Hand-authored override for BT4-105 (Tactical Retreat!).
// runtime-effect fix:
// - Main: SecurityManipulation placeAsSecurity source is a Digimon (not self), placed face down
//   (toTop:true, faceUp absent = false). addSecurity performs rule teardown of its attachments.
// - Security: ＜Recovery +1 (Deck)＞ is a SecurityManipulation op:addTop from deck, not a keyword grant.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: { filter: { controller: "mine", kind: ["Digimon"], allowTokens: true }, count: 1 },
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
