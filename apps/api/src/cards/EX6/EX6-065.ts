// @ts-nocheck
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
                  tokens: ["Legend-Arms"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with the [Legend-Arms] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Legend-Arms"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          delayArmedIntrinsic: true,
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "digivolutionCards",
                  hostFilter: { sourceRef: "triggerSubject" },
                  nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
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
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-065", compiled);
