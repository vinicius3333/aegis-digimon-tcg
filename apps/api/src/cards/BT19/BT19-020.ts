// HAND-FIXED IR for BT19-020 — do not regenerate.
// Re-audit fixes:
//  - "[Kiriha Aonuma]" is a bracketed EXACT name ref, so `nameExact`, not the `name`
//    substring mode that also matched [Kiriha Aonuma & Nene Amano] (EX4-062).
//  - The trailing "Then, ＜Save＞" is the ＜Save＞ keyword (comprehensive 16-20-3): an
//    OPTIONAL placement, carrying `keywords: [{ keyword: "Save" }]` so the registration
//    normalizer defaults its PlaceUnder to the stack BOTTOM (comprehensive 4-3-2).
//    `abortOnDecline` on the last action of an effect is dead and hid the optionality.
//  - "you have 1 or fewer Tamers" counts Tamers in the BATTLE AREA.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Kiriha Aonuma"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              zone: "battleArea",
              countMax: 1,
            },
            raw: "you have 1 or fewer Tamers",
          },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
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
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-020", compiled);
