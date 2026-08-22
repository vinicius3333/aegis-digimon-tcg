// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }]
              },
              count: 1,
              from: ["hand"]
            },
            raw: "By placing 1 [Royal Knight] trait Digimon card from your hand as the bottom digivolution card of any of your [King Drasil_7D6]s on the field",
            underFilter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }]
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target"
          },
          optional: true,
          abortOnDecline: true
        }
      ]
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Omnimon (X Antibody)"], match: "name" }]
            },
            count: 1
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          condition: { kind: "securityAtMost", controller: "mine", value: 1 },
          bindResultAs: "playedOmnimonX"
        },
        {
          kind: "PlaceUnder",
          target: { filter: { boundRef: "playedOmnimonX" }, count: 1 },
          from: ["digivolutionCards"],
          source: "thisDigimon",
          position: "bottom",
          optional: true
        }
      ]
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["X Antibody"]
        }
      ]
    }
  ],
  coverage: "partial",
  residual: [
    "The On Deletion source filter cannot yet restrict digivolutionCards to cards under a King Drasil_7D6 host; hand sourcing is exact, under-King sourcing is conservatively widened to all own digivolution cards."
  ]
};

registerIrCard("EX11-053", compiled);
