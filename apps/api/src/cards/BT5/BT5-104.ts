import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1377: can create Diaboromon token even if no valid DeDigivolve target exists.
// KB Q1378: can create token from existing Diaboromon token in battle area.
// The parenthetical "(you can't trash more cards if target has no digivolution cards
// or becomes lv3)" is a built-in constraint of DeDigivolve, not a separate action.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Trigger ＜De-Digivolve 2＞ on 1 of your opponent's Digimon. (Trash up to 2 cards from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.)",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          effectTextPart:
            "Then, if you have a [Diaboromon] in play, you may play 1 [Diaboromon] Token without paying its memory cost. (Diaboromon Tokens are level 6 white Digimon with a memory cost of 14, 3000 DP, and are Mega form, Unidentified type, and Unknown attribute.)",
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Diaboromon"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you have a [Diaboromon] in play",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-104", compiled);
