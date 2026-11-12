import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const huckmonTextOnField: Filter = {
  controllerDefault: "mine",
  zone: ["battleArea", "breeding"],
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

const optionTriggerText =
  "[All Turns] [Once Per Turn] When any of your Digimon leave the battle area, you may activate 1 [Main] effect on this card's Option side.";

const optionReturnText = "[Main] Return 1 of your opponent's 12000 DP or higher Digimon to the top of the deck.";
const optionDeleteText = "If this effect didn't return, delete 1 of your opponent's lowest play cost Digimon.";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "youHave", filter: huckmonTextOnField, raw: "Use Req. ＜[Huckmon] in text＞" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              optional: true,
              abortOnDecline: true,
              costOptions: [
                {
                  kind: "return",
                  target: { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 },
                  to: "deckBottom",
                  raw: "by returning 1 of your other Digimon to the bottom of the deck",
                },
                {
                  kind: "return",
                  target: {
                    filter: {
                      zone: "digivolutionCards",
                      controller: "mine",
                      nameOrTrait: [{ tokens: ["Gankoomon", "X Antibody"], match: "nameExact" }],
                      hostFilter: { isSelfRef: true },
                    },
                    count: 1,
                  },
                  to: "deckBottom",
                  raw: "by returning 1 [Gankoomon] or [X Antibody] from this Digimon's digivolution cards to the bottom of the deck",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLeavesPlay",
          effectTextPart: optionTriggerText,
          raw: optionTriggerText,
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "ActivateMain", optional: true }],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          effectTextPart: optionReturnText,
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 12000 } }, count: 1 },
          to: "deckTop",
        },
        {
          kind: "Delete",
          effectTextPart: optionDeleteText,
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
          condition: { kind: "ifThisEffectDidNotAct", raw: "this effect didn't return" },
        },
      ],
    },
  ],
  digivolutionRequirement: [{ namesExact: ["Gankoomon"], cost: 2, isAlternate: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-068", compiled);
