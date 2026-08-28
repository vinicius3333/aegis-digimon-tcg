import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT19-079 (Taiki Kudo). source: documented behavior.
// The AUTO-GENERATED header has been removed to protect this file from overwrite.
//
// SEMANTIC CORRECTIONS (Phase 10.1-10):
//
// Auto-declarative effect record only modeled the suspend-self COST of the DigiXros material
//
//   [All Turns] When a Xros Heart Digimon with DigiXros requirements would be played,
//   by suspending this Tamer, cards from under your Tamers can ALSO be placed as
//   DigiXros materials (source-zone expansion).
//
// The zone expansion is consumed by the DigiXros play subsystem: BT19-079 is registered in
// `engine/digiXros/zoneExpanders.ts` (under-Tamer max 100, gated on the played card being
// [Xros Heart]). When a player DigiXros-plays a card and elects to suspend this Tamer
// (`expanderPermanentIds`), `engine/actions/digiXros.ts` reads that registry to legalize materials
// from under the player's Tamers. The `DigiXrosMaterialZoneExpansion` IR clause below is retained
// as documentation; the registry is the authoritative consumer. A3: `BT19-079.test.ts`.
// The SetMemory and Security effects are faithful.
//
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
      trigger: "AllTurns",
      optional: true,
      actions: [
        {
          kind: "DigiXrosMaterialZoneExpansion",
          zones: ["digivolutionCards"],
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
          },
          raw: "[All Turns] When playing a Xros Heart Digimon with DigiXros, by suspending this Tamer, cards from under your Tamers can also be placed as DigiXros materials.",
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
