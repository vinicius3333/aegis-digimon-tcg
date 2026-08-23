// HAND-FIXED IR for BT10-112 — do not regenerate.
// WhenDigivolving PlaceUnder: added from:["hand","trash"]; underFilter:{isSelfRef:true}.
// ActivateEffect: corrected target controller from opponent to mine.
// AllTurns: added SecurityAttack +1 Aura (per Royal Knight in digivolution cards).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 13,
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          optional: true,
        },
        {
          kind: "ActivateEffect",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
              zone: "digivolutionCards",
            },
            count: 1,
          },
          effectType: "WhenDigivolving",
          lastPlacedOnly: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blitz",
            raw: "＜Blitz＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
              raw: "＜Piercing＞",
            },
          },
          while: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            },
            raw: "a card with [Royal Knight] in its traits is in this Digimon's digivolution cards",
          },
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            },
            raw: "a card with [Royal Knight] in its traits is in this Digimon's digivolution cards",
          },
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            },
            raw: "a card with [Royal Knight] in its traits is in this Digimon's digivolution cards",
          },
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            unit: "digivolutionCards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Royal Knight"],
      cost: 5,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT10-112", compiled);
