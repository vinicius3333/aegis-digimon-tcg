import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-069 Rina Shinomiya (Tamer, Blue, [CS], play cost 3)
// Text:
//   [Start of Your Main Phase] If you have a Digimon with [Veemon] or [Veedramon] in its
//   name, gain 1 memory.
//   [Your Turn] When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞.
//   After, 1 of your Digimon may digivolve into a Digimon card with [Veedramon] in its name
//   in the hand with the cost reduced by 2.
//   [Security] Play this card without paying the cost.
//
// Rules notes (no card-specific KB entries — EX13 is pre-release):
//   - "with [X] in its name" is SUBSTRING name matching (`match: "name"`), unlike a bare
//     bracketed [Name], which is exact. BT11-112 (the earlier Rina Shinomiya) prints the
//     same "[Veemon] or [Veedramon] in its name" sentence and uses the same shape.
//   - comprehensive §3-4-5-8: breeding-area card information can't be referenced unless an
//     effect says so, so "if you have a Digimon" is battle-area only.
//   - comprehensive §6-2-1: every one of the turn player's Digimon and Tamers unsuspends
//     simultaneously at the start of the unsuspend phase, so this Tamer is already
//     unsuspended (and therefore able to pay its own cost) when the unsuspend of one of its
//     controller's Digimon triggers this clause.
//   - "by suspending this Tamer" is a cost gating the WHOLE sentence: declining it resolves
//     neither the draw nor the digivolve (BT22-101/EX11-062 shape). "After," introduces an
//     independently optional follow-up, so it is a nested `optional` action rather than a
//     second cost-gated block.
//   - glossary (＜Digivolve＞ cost reduction): "the digivolve cost can't be reduced to less
//     than zero", so `reduceCost: 2` floors at 0 rather than refunding memory.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Veemon", "Veedramon"], match: "name" }],
            },
            raw: "you have a Digimon with [Veemon] or [Veedramon] in its name",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          raw: "When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞. After, 1 of your Digimon may digivolve into a Digimon card with [Veedramon] in its name in the hand with the cost reduced by 2.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-069", compiled);
