// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main] Add your top security card to your hand and Recovery +1, then place this
// card in the battle area. [All Turns] Delay: when a card is removed from your
// security, place the top card of one of your Aegiochusmon/Jupitermon Digimon as
// the top security card.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck" },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Aegiochusmon", "Jupitermon"], match: "name" }],
                  excludeSelf: false,
                },
                count: 1,
              },
              fromDigivolutionTop: true,
              toTop: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-093", compiled);
