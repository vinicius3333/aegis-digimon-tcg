// @ts-nocheck
// Hand-audited IR for LM-009 (Airdramon).
// The printed [Your Turn] effect is a pay-time replacement: suspend this
// Digimon, then reduce the cost by 2 only for an Angoramon-text card.  The
// previous generated module installed only the suspension watcher and never
// reduced either play or digivolution costs.
// Audit fixes (LM audit):
//   - the play half reads "a card with [Angoramon] in its text", so it is not limited to
//     Digimon cards
//   - the digivolve half reads "one of your Digimon would digivolve INTO such a card": Q3998
//     puts the Angoramon-text requirement on the destination alone, never on the base
//   - the <Rush> grant is printed without "you may", so it is mandatory
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
      ],
    },
    // Keep the digivolution reducer separate from the play reducer. A mixed effect is
    // classified as BeforePayCost because of wouldBePlayed, which leaves the direct
    // digivolution path without this continuous subscription.
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
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
