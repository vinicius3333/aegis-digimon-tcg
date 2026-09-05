import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Digivolve] [Maquinamon]: Cost 2
// [When Moving] [When Digivolving]: You may link 1 [Maquinamon] from your hand or this Digimon's
//   digivolution cards to 1 of your Digimon without paying the cost.
// [Your Turn][Once Per Turn]: When this Digimon gets linked (KB Q5832: NOT for <Mind Link>),
//   if you have 1 or fewer Tamers, you may play 1 [Unchained] from your hand or trash without
//   paying the cost.
// Inherited: <Piercing>
const compiled: CompiledCard = {
  digivolutionRequirement: [
    {
      namesExact: ["Maquinamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
              ],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          // "When THIS Digimon gets linked": `whenLinked` is a board-wide bus, and an unfiltered
          // watcher fires for every link on the board. `isSelfRef` binds it to this permanent,
          // matching the peer idiom (BT23-016, BT24-006).
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Unchained"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              condition: {
                kind: "permanentCount",
                seat: "mine",
                filter: {
                  controller: "mine",
                  kind: ["Tamer"],
                },
                op: "lte",
                value: 1,
                raw: "you have 1 or fewer Tamers",
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-029", compiled);
