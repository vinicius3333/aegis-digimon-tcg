import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const chuumonOrSukamonNamedCost: Filter = {
  controller: "mine",
  zone: ["hand", "digivolutionCards"],
  nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
};

const rewriteOneOpponentDigimon = (): Action => ({
  kind: "GrantStatic",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  grant: { originalName: "Sukamon", color: "white", dp: 3000 },
  duration: "untilOpponentTurnEnd",
  cost: {
    kind: "trash",
    target: { filter: chuumonOrSukamonNamedCost, count: 1 },
    raw: "By trashing 1 card with [Chuumon] or [Sukamon] in its name from your hand or your Digimon's digivolution cards",
  },
  optional: true,
  abortOnDecline: true,
  raw: "you may change the base name, color and DP of 1 of your opponent's Digimon to [Sukamon], white and 3000 until their turn ends",
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [rewriteOneOpponentDigimon()] },
    { trigger: "WhenDigivolving", actions: [rewriteOneOpponentDigimon()] },
    { trigger: "OnDeletion", actions: [rewriteOneOpponentDigimon()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "any",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
          },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    playCostLte: 3,
                    nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "trash",
            },
          ],
          raw: "When any other Digimon with [Sukamon] in their names are deleted, reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    { reduceCost: 4, materials: [{ count: 3, kinds: ["Digimon"], names: ["Sukamon"], levelMax: 4 }] },
  ],
};

registerIrCard("EX13-031", compiled);
