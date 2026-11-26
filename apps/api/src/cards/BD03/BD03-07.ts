import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 2,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Black"],
                    levelComparison: { op: "lte", value: 4 },
                    keywords: ["Blocker"],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "deckBottom",
              raw: "reveal the top 2 cards of your deck. You may play 1 black level 4 or lower Digimon card with ＜Blocker＞ among them without paying the cost. Return the rest to the bottom of the deck",
            },
          ],
          raw: "When this Digimon suspends, reveal the top 2 cards of your deck. You may play 1 black level 4 or lower Digimon card with ＜Blocker＞ among them without paying the cost. Return the rest to the bottom of the deck",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Bird Dragon"],
          raw: "[Rule] Trait: Has [Bird Dragon] Type.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD03-07", compiled);
