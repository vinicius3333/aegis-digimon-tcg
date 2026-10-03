import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              zone: ["battleArea", "breeding"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            raw: "you have a Digimon or Tamer with the [Appmon] trait on the field",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Reveal the top 3 cards of your deck. Add 1 card with the [Appmon]/[App Driver] trait among them to the hand. Trash the rest.",
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Appmon", "App Driver"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
        { effectTextPart: "Then, place this card in the battle area.", kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Link",
          target: {
            filter: { controller: "mine", hasLinkRequirement: true },
            count: 1,
          },
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          payCost: false,
          optional: true,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-097", compiled);
