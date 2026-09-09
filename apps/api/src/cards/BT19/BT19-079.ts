import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT19-079 (Taiki Kudo).
//
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [All Turns] When any of your [Xros Heart] trait Digimon cards with DigiXros requirements
//     would be played, by suspending this Tamer, you may place cards from under your Tamers
//     as digivolution cards for a DigiXros.
//   [Security] Play this card without paying the cost.
//
// The [All Turns] clause is a `wouldBePlayed` replacement, exactly like its printed siblings
// BT19-087 and EX10-064: it may only fire on a play of a [Xros Heart] Digimon that actually
// carries DigiXros requirements. Modelling it as a bare `AllTurns` action (the shape this card
// carried before the BT19 re-audit) let every [All Turns] window offer the suspend cost with no
// play in sight, so accepting it suspended the Tamer for nothing.
//
// The direct `playCard` DigiXros verb reads the same permission from the registry in
// `packages/shared/src/cards/zoneExpanders.ts` (`appliesTo` = has the [Xros Heart] trait,
// `underTamerMax` 100, no `underTamerHostScope`, so any of your Tamers may host — KB Q3139);
// `engine/actions/digiXros.ts` consults it when the intent names `expanderPermanentIds`.
// Behaviour: `BT19-079.test.ts`.
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
            raw: "If you have 2 or less memory",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            hasDigiXrosRequirement: true,
          },
          mode: "instead",
          optional: true,
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              zones: ["underTamers"],
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              raw: "you may place cards from under your Tamers as digivolution cards for a DigiXros",
            },
          ],
          raw: "[All Turns] When any of your [Xros Heart] trait Digimon cards with DigiXros requirements would be played, by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for a DigiXros.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-079", compiled);
