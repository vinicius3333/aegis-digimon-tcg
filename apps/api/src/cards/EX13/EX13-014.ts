import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const huckmonOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

const useHuckmonOption = (): Action => ({
  kind: "UseOptionWithoutCost",
  filter: huckmonOption,
  target: { filter: huckmonOption, count: 1, source: "thisDigimon" },
  from: ["hand", "digivolutionCards"],
  payCost: false,
  optional: true,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [useHuckmonOption()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [useHuckmonOption()],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              effectTextPart:
                "[All Turns] [Once Per Turn] When any of your Digimon are played, you may delete 1 of your opponent's lowest DP Digimon.",
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
                count: 1,
              },
              optional: true,
            },
            {
              effectTextPart:
                "Then, if you don't have [Atho or René & Por], you may play 1 [Atho, René & Por] Token. (Digimon/White/6000 DP/＜Reboot＞ ＜Blocker＞ ＜Decoy (Red)/(Black)＞)",
              kind: "PlayToken",
              tokens: [
                {
                  name: "Atho, René & Por",
                  kind: "Digimon",
                  color: "White",
                  dp: 6000,
                  keywords: [
                    { keyword: "Reboot" },
                    { keyword: "Blocker" },
                    { keyword: "Decoy", colors: ["Red", "Black"] },
                  ],
                },
              ],
              count: 1,
              payCost: false,
              optional: true,
              condition: {
                kind: "youHaveNone",
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["AthoRenePor Token"], match: "nameExact" }],
                },
                raw: "you don't have [Atho or René & Por]",
              },
            },
          ],
          raw: "When any of your Digimon are played, you may delete 1 of your opponent's lowest DP Digimon. Then, if you don't have [Atho or René & Por], you may play 1 [Atho, René & Por] Token.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Huckmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        { count: 1, level: 5, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
        { count: 1, level: 4, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
        { count: 1, level: 3, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
      ],
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-014", compiled);
