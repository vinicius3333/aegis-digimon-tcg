// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your hand",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your hand",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: {
            kind: "triggerByYourDigimonEffect",
            raw: "one of your Digimon's effects adds cards to your hand",
          },
          actions: [
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-026", compiled);
export { compiled };
