import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The zone-expander registry carries the card-specific "one Tamer" host scope used by the
// DigiXros validator; this module remains the authoritative executable IR registration.
export const compiled: CompiledCard = {
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
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            hasDigiXrosRequirements: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: { filter: { controller: "mine", zone: "underTamer" }, count: "all" },
              underTamerHostScope: "single",
              underFilter: { isTriggerSource: true },
              asDigiXrosMaterial: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
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

registerIrCard("BT10-088", compiled);
