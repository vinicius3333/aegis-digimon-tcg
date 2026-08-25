// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mineralOrRock = [{ tokens: ["Mineral", "Rock"], match: "trait" as const }];

const placeUnderTriggeredDigimon = {
  kind: "PlaceUnder" as const,
  target: {
    filter: {
      controller: "mine" as const,
      kind: ["Digimon" as const],
      nameOrTrait: mineralOrRock,
    },
    count: 1,
    from: ["hand" as const, "trash" as const],
  },
  from: ["hand" as const, "trash" as const],
  underFilter: { isTriggerSource: true },
  position: "bottom",
  cost: {
    kind: "suspend" as const,
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
              count: 1,
              from: ["hand", "digivolutionCards"],
            },
            raw: "By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards",
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
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
          actions: [placeUnderTriggeredDigimon],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
          actions: [placeUnderTriggeredDigimon],
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

registerIrCard("EX11-065", compiled);
