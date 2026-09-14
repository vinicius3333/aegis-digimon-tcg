import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may place 1 Digimon card with the [Angel]/[Archangel]/[Three Great Angels] trait from your hand at the bottom of your security stack.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels"], match: "trait" }],
          },
          actions: [
            {
              kind: "SearchSecurity",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Three Great Angels"], match: "trait" }],
                },
                count: 1,
              },
              then: {
                kind: "PlayWithoutCost",
                source: "security",
                payCost: false,
                optional: true,
              },
            },
            { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
          ],
        },
      ],
      keywords: [{ keyword: "Delay" }],
    },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("EX6-068", compiled);
