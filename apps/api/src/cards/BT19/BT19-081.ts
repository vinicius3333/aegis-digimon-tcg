// HAND-FIXED IR for BT19-081 — do not regenerate.
//
// BT19-081 Kiriha Aonuma (Blue Tamer, cost 3, [General]/[Blue Flare]).
//
//   [Start of Your Main Phase] By placing 1 Digimon card with the [Blue Flare]/[Xros Heart]
//     trait from your hand under any of your Tamers, gain 1 memory.
//   [All Turns] When any of your [Blue Flare] trait Digimon cards with DigiXros requirements
//     would be played, by suspending this Tamer, you may place cards from under your Tamers
//     as digivolution cards for a DigiXros.
//   [Security] Play this card without paying the cost.
//
// KB Q3142 (under-Tamer is ADDED to the normal hand/battle-area sources), Q3143 (the material
// may sit under ANY of your Tamers, not only this one), Q3144 (it applies to every qualifying
// play, not once per turn).
//
// The [All Turns] clause is the same printed permission as its sibling BT19-079 (Taiki Kudo)
// and is modelled the same way: a `wouldBePlayed` replacement whose payload is the
// `DigiXrosMaterialZoneExpansion` node. The earlier shape — a `PlaceUnder` with
// `zone: "underTamer"` and `count: "all", upTo: true` — described a card-moving action the
// clause never performs: the printed clause only widens the DigiXros material SOURCE ZONES,
// and the number of materials is fixed by the played card's DigiXros recipe, never by a
// player-chosen subset of what sits under the Tamers.
//
// The permission is consumed by the DigiXros play subsystem, which reads the static registry in
// `packages/shared/src/cards/zoneExpanders.ts` when a play intent names `expanderPermanentIds`
// (`apps/api/src/engine/actions/digiXros.ts`). BT19-081 is registered there with the [Blue Flare]
// gate, `underTamerMax: 100` and no `underTamerHostScope`, so the material may come from under any
// of the player's Tamers (Q3143). Behaviour: `BT19-081.test.ts`.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                // "with the [Blue Flare]/[Xros Heart] trait" is an EXACT trait match.
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare", "Xros Heart"],
                    match: "trait",
                  },
                ],
              },
              // "from your hand": the place-cost source zone defaults to the hand
              // (interpreter/costs.ts), stated here so the printed zone is explicit.
              from: ["hand"],
              count: 1,
            },
            // "under any of your Tamers": the destination host is chosen from every Tamer
            // this player controls, not only this one.
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            raw: "By placing 1 Digimon card with the [Blue Flare]/[Xros Heart] trait from your hand under any of your Tamers",
          },
          // "By placing …, gain 1 memory" is a paid processing condition: whether to pay it is
          // the controller's choice (comprehensive 15-7-4). Without `optional` the placement is
          // forced on every Main phase entry that has a legal hand card.
          optional: true,
          raw: "gain 1 memory",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "instead",
          optional: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
            hasDigiXrosRequirements: true,
          },
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              zones: ["underTamers"],
              duration: "forTheTurn",
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
              raw: "you may place cards from under your Tamers as digivolution cards for a DigiXros",
            },
          ],
          raw: "[All Turns] When any of your [Blue Flare] trait Digimon cards with DigiXros requirements would be played, by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for a DigiXros.",
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

registerIrCard("BT19-081", compiled);
