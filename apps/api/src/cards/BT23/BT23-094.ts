// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT23-094 (Nanomachine Break).
// [Main]: give 1 opponent Digimon SecurityAttack -1 + disable WD/WA until opp turn ends; place self.
// [Your Turn] SubTrigger whenAttacking (CS trait Digimon): grant <Delay> to self.
// [Main]+Delay keyword: delayed payoff — give 1 opponent Digimon SecurityAttack -1 + disable WD/WA.
// [Security]: same effect as [Main] + place self.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              zone: ["battleArea", "breeding"],
              nameOrTrait: [
                {
                  tokens: ["CS"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon or Tamer with the [CS] trait on the field",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "BT23094MainTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security A. -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            fromSelectionRef: "BT23094MainTarget",
            count: 1,
          },
          timings: ["whenDigivolving", "whenAttacking"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "BT23094DelayTarget",
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security A. -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "DisableTimingEffect",
              target: { fromSelectionRef: "BT23094DelayTarget", count: 1 },
              timings: ["whenDigivolving", "whenAttacking"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "BT23094SecTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security A. -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            fromSelectionRef: "BT23094SecTarget",
            count: 1,
          },
          timings: ["whenDigivolving", "whenAttacking"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-094", compiled);
