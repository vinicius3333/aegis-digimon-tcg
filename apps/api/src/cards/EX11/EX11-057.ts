import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };
const iceSnowDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ match: "trait", tokens: ["Ice-Snow"] }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: opponentDigimon,
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { ...opponentDigimon, digivolutionCards: "hasAny" }, count: "all" },
          amount: 1,
          scaling: { per: 1, filter: iceSnowDigimon, unit: "cards" },
          scope: "acrossDigimon",
          choose: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: opponentDigimon,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("EX11-057", compiled);
