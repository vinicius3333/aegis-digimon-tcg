// HAND-FIXED IR for BT19-082 — do not regenerate.
//
// BT19-082 Yao Qinglan (Blue Tamer, cost 4, [LIBERATOR]).
//
//   [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
//   [Your Turn] When any of your Digimon with [Aqua]/[Sea Animal] in one of its traits attack,
//     by suspending this Tamer, you may place 1 level 5 or lower Digimon card with
//     [Aqua]/[Sea Animal] in one of its traits from your hand as that Digimon's bottom
//     digivolution card.
//   [Security] Play this card without paying the cost.
//
// No card-specific rulings: `node tools/kb/query.mjs card BT19-082` reports no knowledge-base
// entries, and docs/audits/BT19.md#knowledge-base-index lists 0 Q&A for this card.
//
// "with [X] in one of its traits" is a SUBSTRING trait match, not the exact "with the [X] trait"
// form, so both refs use `match: "traitContains"`. This is load-bearing rather than cosmetic:
// no card in the catalog carries a trait spelled exactly "Aqua" — the printed reference reaches
// [Aquatic], [Aquabeast] and [Ancient Aquabeast] — so the exact form this module previously used
// made the whole [Aqua] half of the clause unreachable.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
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
                tokens: ["Aqua", "Sea Animal"],
                match: "traitContains",
              },
            ],
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Aqua", "Sea Animal"],
                      match: "traitContains",
                    },
                  ],
                },
                from: ["hand"],
                count: 1,
              },
              underFilter: {
                controller: "mine",
                kind: ["Digimon"],
                isTriggerSource: true,
              },
              position: "bottom",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
            },
          ],
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-082", compiled);
