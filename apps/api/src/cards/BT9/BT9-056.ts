// @ts-nocheck
// HAND-FIXED IR for BT9-056 (Dinotigermon) — do not regenerate over this file.
// The generated [When Attacking] gate ("If a card with [Leomon] in its name or
// [X Antibody] is in this Digimon's digivolution cards" — KB Q1852) was a raw
// condition, always unmet. It is now the structured selfDigivolutionStackHasTrait
// condition with two OR'd NAME refs ([Leomon], [X Antibody]) matched against each
// digivolution card. The [Your Turn] SubTrigger also carries a sourceFilter
// (controller:opponent, kind:[Digimon,Tamer]) so it fires only on the printed
// subject ("an opponent's Digimon or Tamer becomes suspended"), not any suspension.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Leomon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "a card with [Leomon] in its name or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          raw: "[Your Turn] When an opponent's Digimon or Tamer is suspended, you may unsuspend this Digimon.",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon", "Tamer"],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["SaberLeomon"],
      cost: 1,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT9-056", compiled);
