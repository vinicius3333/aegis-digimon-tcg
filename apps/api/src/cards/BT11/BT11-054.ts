// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // This universal name alias is consumed by the loose-card resolver, which
      // intentionally scans Rule effects rather than ordinary Static modifiers.
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Leomon"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue", "Green"], playCostLte: 4 },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          // Printed "by an effect" excludes ordinary hand plays.
          sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Rush", raw: "＜Rush＞" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-054", compiled);
