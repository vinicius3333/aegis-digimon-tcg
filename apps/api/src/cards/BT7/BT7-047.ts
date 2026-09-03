// HAND-FIXED IR for BT7-047 (MetalKabuterimon) — do not regenerate over this file.
// The generated [When Digivolving] gate ("If a card with [Hybrid] in its traits or
// [J.P. Shibayama] is in this Digimon's digivolution cards") was a raw condition —
// always unmet, so the suspend never fired. It is now the structured
// selfDigivolutionStackHasTrait condition with two OR'd refs: [Hybrid] as a trait
// match and [J.P. Shibayama] as a name match (both supported by matchNameOrTrait).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Green"],
            },
            count: 1,
          },
          payCost: true,
          from: ["hand"],
          costOverride: 2,
          asLevel: 3,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["J.P. Shibayama"],
                  match: "nameExact",
                },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [J.P. Shibayama] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Green"],
    },
  ],
};

registerIrCard("BT7-047", compiled);
