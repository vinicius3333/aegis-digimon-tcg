// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mineralOrRock = [{ tokens: ["Mineral", "Rock"], match: "trait" as const }];

// Q4277: the trigger checks the host whose digivolution cards were trashed; the
// identity of the trashed card itself is unrestricted.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: mineralOrRock,
            byEffect: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: mineralOrRock,
                },
                count: 1,
              },
              from: ["trash"],
              underFilter: { controller: "mine", kind: ["Digimon"] },
              position: "bottom",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
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
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-169", compiled);
