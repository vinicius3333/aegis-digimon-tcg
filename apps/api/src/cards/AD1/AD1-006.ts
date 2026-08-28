// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          optional: true,
          raw: "When this Digimon would leave the battle area other than by DigiXros, you may place cards under a Tamer and play 1 such card.",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart", "Blue Flare"],
                      match: "trait",
                    },
                  ],
                  zone: "digivolutionCards",
                  hostFilter: {
                    isSelfRef: true,
                  },
                },
                count: 4,
                upTo: true,
                minimum: 1,
              },
              from: ["digivolutionCards"],
              underFilter: {
                controller: "mine",
                kind: ["Tamer"],
              },
            },
            {
              kind: "PlayFromZone",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart", "Blue Flare"],
                      match: "trait",
                    },
                  ],
                  hostFilter: {
                    isSelfRef: true,
                  },
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              digiXrosMaterialsFrom: ["battleArea", "underTamers"],
              digiXrosSourceMaterialName: "Shoutmon",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Xros Heart", "Blue Flare"],
      cost: 2,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["OmniShoutmon"],
        },
        {
          names: ["ZeigGreymon"],
        },
        {
          names: ["Ballistamon"],
        },
        {
          names: ["Dorulumon"],
        },
        {
          names: ["Starmons"],
        },
        {
          names: ["Sparrowmon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("AD1-006", compiled);
