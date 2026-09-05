import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX11-040 Mulemon
// Text: [On Play] [When Digivolving] You may link 1 [Maquinamon] from your hand or this
// Digimon's digivolution cards to 1 of your Digimon without paying the cost.
// Text: [Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer
// Tamers, you may play 1 [Unchained] from your hand or trash without paying the cost.
// KB Q5866: "when this Digimon gets linked" triggers on real link actions, NOT <Mind Link>.
// Fixes:
//   - On Play/WhenDigivolving: replaced PlayWithoutCost (wrong) with Link action
//   - whenLinked SubTrigger: inner action was PlayWithoutCost (correct here for Unchained)
//   - "if you have 1 or fewer Tamers" is a `permanentCount` condition with op "lte" and
//     value 1, not the persisted record's `youHave` (which only asks whether a Tamer exists
//     and would invert the printed gate)
//   - "from your hand or THIS Digimon's digivolution cards": `digivolutionCards` enumerates
//     every stack this seat controls, so the self scope is stated as
//     `hostFilter: { isSelfRef: true }`, which constrains only the hosted zone
const compiled: CompiledCard = {
  digivolutionRequirement: [{ namesExact: ["Maquinamon"], cost: 2, isAlternate: true }],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
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
          recipient: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          payCost: false,
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
              controllerDefault: "mine",
              kind: ["Digimon"],
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
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
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
          event: "whenLinked",
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
                raw: "if you have 1 or fewer Tamers",
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
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-040", compiled);
