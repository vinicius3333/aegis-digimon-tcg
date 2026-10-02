import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if [Gankoomon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play, until the end of your opponent's turn, all of your Digimon get +2000 DP and your opponent's effects can't return them to hands or decks or reduce their DP.",
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Gankoomon"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "[Gankoomon] is in this Digimon's digivolution cards",
              },
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Sistermon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Sistermon] in its name in play",
              },
            ],
            raw: "[Gankoomon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "dpImmune",
          byOpponentEffectsOnly: true,
          whileMatchesTargetFilter: true,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Gankoomon"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "[Gankoomon] is in this Digimon's digivolution cards",
              },
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Sistermon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Sistermon] in its name in play",
              },
            ],
            raw: "[Gankoomon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gankoomon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

// "Your opponent's effects can't return them to hands or decks" shares the DP lock's targets,
// condition and duration.
for (const effect of compiled.effects) {
  const index = effect.actions.findIndex((action) => action.kind === "Restrict" && action.restriction === "dpImmune");
  const dpLock = effect.actions[index];
  if (dpLock?.kind === "Restrict") {
    effect.actions.splice(index + 1, 0, { ...dpLock, restriction: "cannotReturnToHandOrDeck" });
  }
}

registerIrCard("BT10-068", compiled);
