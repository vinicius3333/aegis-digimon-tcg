// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX11-059 (Reina Oumi).
// runtime-effect fixes: the [All Turns] DNA digivolve needs TWO materials from two different
// zones — "1 of your [NSo] trait Digimon" (battle area) and "1 [NSo] trait Digimon card in
// the trash" — not a single trash-only filter with a duplicated nameOrTrait entry.
// - `materials`: battle-area [NSo] Digimon (mine).
// - `looseMaterials`: trash [NSo] Digimon card (mine) — the BT18-073 two-zone DnaDigivolve
//   pattern.
// - `into`: restricted to `zone: "hand"` per the text ("into a Digimon card ... in the hand").
// `payCost: true` is unchanged (the text has no "without paying the cost" clause); the
// separate `cost` (suspending this Tamer) is a normal per-action cost the interpreter already
// pays generically before any action — including DnaDigivolve — runs.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["NSo"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 [NSo] trait card from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["NSo"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 [NSo] trait card from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
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
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["NSo"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: {
                filter: {
                  zone: "battleArea",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["NSo"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              looseMaterials: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["NSo"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
                from: ["trash"],
              },
              into: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["NSo"],
                    match: "trait",
                  },
                ],
              },
              payCost: true,
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
          ],
          raw: "onDeletionOf",
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

registerIrCard("EX11-059", compiled);
