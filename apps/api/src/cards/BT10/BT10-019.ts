// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const blueFlare = { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] };
const metalGreymon = {
  controller: "mine",
  zone: "trash",
  nameOrTrait: [{ tokens: ["MetalGreymon"], match: "nameExact" }],
};
const kiriha = { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Kiriha Aonuma"], match: "nameExact" }] };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Return 1 MetalGreymon from trash", "Reveal 4 cards"],
          options: [
            [{ kind: "Return", target: { filter: metalGreymon, count: 1 }, from: ["trash"], to: "hand" }],
            [
              {
                kind: "RevealAdd",
                revealCount: 4,
                add: [{ filter: blueFlare, count: 2, to: "hand" }],
                rest: "deckBottom",
              },
            ],
          ],
          optionConditions: [
            {
              kind: "allOf",
              conditions: [
                { kind: "youHave", filter: kiriha },
                { kind: "selfHasMinTrash", count: 1, filter: metalGreymon },
              ],
            },
            null,
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [{ kind: "PlaceUnder", target: self, optional: true }],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: self,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] } },
              {
                kind: "opponentHas",
                filter: { zone: "battleArea", controllerDefault: "opponent", kind: ["Digimon"] },
                count: 2,
              },
            ],
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-019", compiled);
