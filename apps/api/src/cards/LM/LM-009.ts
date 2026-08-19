// @ts-nocheck
// Hand-audited IR for LM-009 (Airdramon).
// The printed [Your Turn] effect is a pay-time replacement: suspend this
// Digimon, then reduce the cost by 2 only for an Angoramon-text card.  The
// previous generated module installed only the suspension watcher and never
// reduced either play or digivolution costs.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const angoramonText = {
  nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
};

const suspendSelf = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Digimon",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            ...angoramonText,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              cost: suspendSelf,
              optional: true,
              abortOnDecline: true,
              raw: "reduce the play cost by 2",
            },
          ],
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            ...angoramonText,
          },
          into: { controllerDefault: "mine", kind: ["Digimon"], ...angoramonText },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              cost: suspendSelf,
              optional: true,
              abortOnDecline: true,
              raw: "reduce the digivolution cost by 2",
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  ...angoramonText,
                },
                count: 1,
              },
              keyword: { keyword: "Rush" },
              duration: "forTheTurn",
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-009", compiled);
