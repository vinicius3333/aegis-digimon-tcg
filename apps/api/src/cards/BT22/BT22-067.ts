// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const buffAndAttack = [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    amount: 3000,
    duration: "untilOpponentTurnEnd",
  },
  {
    kind: "Attack",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    optional: true,
    attackPlayer: true,
  },
] as const;

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
    { trigger: "OnPlay", actions: [...buffAndAttack] },
    { trigger: "WhenDigivolving", actions: [...buffAndAttack] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon", "Tamer"],
                    colors: ["Black", "Red"],
                    playCostLte: 4,
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "trash",
              condition: { kind: "attackTargetsPlayer", raw: "Digimon attack players" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
    {
      names: ["Rie Kishibe"],
      cost: 5,
      whileCondition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "security",
        op: "lte",
        value: 3,
        raw: "while you have 3 or fewer security cards",
      },
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-067", compiled);
export default compiled;
