// HAND-FIXED IR for BT10-060 — do not regenerate.
// OpponentsTurn Unsuspend: added condition (same as Aura while — only when Shoutmon/Mervamon in name).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
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
            kind: "modifyDP",
            amount: 3000,
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              excludeSelf: true,
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart", "Twilight"],
                  match: "trait",
                },
              ],
            },
            raw: "you have another Digimon or Tamer with [Xros Heart] or [Twilight] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
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
              keyword: "Reboot",
              raw: "＜Reboot＞",
            },
          },
          while: {
            kind: "selfHasNameContaining",
            names: ["Shoutmon", "Mervamon"],
            raw: "this Digimon has [Shoutmon] or [Mervamon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT10-060", compiled);
