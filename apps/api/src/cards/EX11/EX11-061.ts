// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX11-061 (the AUTO-GENERATED header is absent on purpose so
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
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Puppet"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levels: [3],
                  nameOrTrait: [
                    {
                      tokens: ["Puppet"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
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
              optional: true,
              abortOnDecline: true,
            },
            {
              // "At turn end, delete the Digimon this effect played" (KB Q5915/Q5916).
              // `DelayedDelete` arms the engine's turn-end delete watcher on the permanent the
              // PlayWithoutCost above just produced (ctx.lastPlayedPermanentIds). Two corrections
              // over the declarative effect record: (1) it lived OUTSIDE the whenOneOfYoursDigivolves watcher,
              // so it armed when the [Your Turn] clause installed rather than after a play, and
              // (2) its Delete carried the never-read `playedByThisEffect` filter, which matched
              // every permanent. documented behavior (per-played-permanent OnEndTurn delete).
              kind: "DelayedDelete",
              raw: "at turn end, delete the Digimon this effect played",
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

registerIrCard("EX11-061", compiled);
