import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const jesmonOrSistermon: NonNullable<Action["condition"]> = {
  kind: "anyOf",
  conditions: [
    { kind: "selfHasInDigivolutionCards", nameOrTrait: [{ tokens: ["Jesmon"], match: "nameExact" }] },
    {
      kind: "youHave",
      filter: {
        zone: "battleArea",
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
      },
    },
  ],
};

/**
 * The player-wide +2000 DP already reaches later arrivals (Q1945). The attack-legality grant has
 * no player-wide ledger, so it is attached to each Digimon that is played or moves out of breeding.
 */
function laterEntrantCanAttackUnsuspended(event: "whenPlayed" | "whenMovedFromBreeding"): Action {
  return {
    kind: "SubTrigger",
    event,
    playerScoped: true,
    duration: "untilOpponentTurnEnd",
    sourceFilter: { controller: "mine", kind: ["Digimon"] },
    actions: [
      {
        kind: "GrantCanAttackUnsuspended",
        target: { sourceRef: "triggerSubject", filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
        duration: "untilOpponentTurnEnd",
      },
    ],
    condition: jesmonOrSistermon,
    raw: "Until the end of your opponent's turn, all of your Digimon that enter play later may also attack unsuspended Digimon.",
  };
}

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
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
            "Then, if [Jesmon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play, until the end of your opponent's turn, all of your Digimon may also attack unsuspended Digimon and get +2000 DP.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          playerWide: true,
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfHasInDigivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Jesmon"],
                    match: "nameExact",
                  },
                ],
                raw: "[Jesmon] is in this Digimon's digivolution cards",
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
            raw: "[Jesmon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play",
          },
        },
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfHasInDigivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Jesmon"],
                    match: "nameExact",
                  },
                ],
                raw: "[Jesmon] is in this Digimon's digivolution cards",
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
            raw: "[Jesmon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play",
          },
        },
        laterEntrantCanAttackUnsuspended("whenPlayed"),
        laterEntrantCanAttackUnsuspended("whenMovedFromBreeding"),
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Jesmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-016", compiled);
