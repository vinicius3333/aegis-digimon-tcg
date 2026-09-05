import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
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
                nameOrTrait: [
                  {
                    tokens: ["Bagra Army", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            position: "bottom",
            raw: "By placing 1 [Bagra Army] or [Twilight] trait Digimon card from your hand or trash under this Tamer",
          },
          optional: true,
          abortOnDecline: true,
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
            nameOrTrait: [
              {
                tokens: ["Bagra Army", "Twilight"],
                match: "trait",
              },
            ],
            hasDigiXrosRequirement: true,
          },
          mode: "instead",
          optional: true,
          actions: [
            {
              kind: "DigiXrosMaterialZoneExpansion",
              // "under your Tamers" is the ZoneRef `underTamers`. The prior `tamerCards`
              // token is not a ZoneRef at all: the material picker in actions/play.ts only
              // recognizes underTamers/underMyTamers/underTamer/digivolutionCards and
              // trash (`ledgerUnderTamer`/`ledgerTrash`), so the under-Tamers half of
              // Q5175/Q5176 was silently dead and only the trash half applied.
              zones: ["underTamers", "trash"],
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              raw: "1 card from under your Tamers and 1 card in your trash can also be placed for their DigiXros",
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

registerIrCard("EX10-064", compiled);
