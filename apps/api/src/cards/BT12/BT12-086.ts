import { type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Save"], differentColors: true },
              count: 2,
              to: "hand",
              upTo: true,
            },
          ],
          rest: "deckBottom",
        },
      ],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"] },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Jamming", raw: "＜Jamming＞" } },
          while: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
            raw: "this Digimon has ＜Save＞ in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-086", compiled);
export { compiled };
