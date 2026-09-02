import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon with [Lucemon] in its name in its name on the field",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      // "If you have a Digimon with [Lucemon] in its name" gates the WHOLE printed clause, not
      // just its first step. An action-level condition only skips its own action
      // (`runAction` returns false on a failed gate, and `effect.ts` does not break the loop),
      // so with the gate on `trashSecurityTop` alone the trailing `Attack` would still resolve
      // whenever the effect was reached without passing `canActivateEffect`. The effect-level
      // condition is the hard gate: `runEffect` returns before any action runs. It is kept on
      // the leading action as well because `canActivateEffect`'s leading-`abortOnDecline` branch
      // reads THAT condition when deciding whether the clause may be declared at all.
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }],
        },
        raw: "you have a Digimon with [Lucemon] in its name in its name",
      },
      actions: [
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }],
            },
            raw: "you have a Digimon with [Lucemon] in its name in its name",
          },
          cost: {
            kind: "return",
            target: {
              filter: { isSelfRef: true, zone: "trash", controller: "mine" },
              count: 1,
              isSelf: true,
              from: ["trash"],
            },
            to: "deckBottom",
            raw: "by returning this card to the bottom of the deck",
          },
          // CR 15-7-4: "by returning this card to the bottom of the deck" is a declinable
          // processing condition, not a mandatory step, and Q5185/Q5186 both phrase it as
          // "can it be activated". Without `optional` the interpreter auto-pays the return with
          // no prompt (runAction's mandatory-cost branch), which forces the player to bottom-deck
          // Paradise Lost at every end of turn. `abortOnDecline` keeps the decline covering the
          // whole package: no security trash and no attack — the same shape as EX10-060/EX10-063.
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
          },
          withoutSuspending: true,
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            bindAs: "lucemonBuffTarget",
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "lucemonBuffTarget",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "lucemonBuffTarget",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "lucemonBuffTarget",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-071", compiled);
