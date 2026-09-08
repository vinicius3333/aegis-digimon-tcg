import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      // Q2269: "by returning 1 of your [Kristy Damon]s to the hand" is a processing condition of
      // the whole clause, so it is offered — and paid — even when no [Garudamon] is in hand.
      // Encoded as the leading optional action (declining it aborts the clause) rather than as
      // the Digivolve's `cost`, because a cost fused to the Digivolve is only offered when that
      // digivolve already has a legal target.
      condition: {
        kind: "triggerEnteredByEffect",
        raw: "played by an effect",
      },
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Kristy Damon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
          abortOnDecline: true,
          raw: "by returning 1 of your [Kristy Damon]s to the hand",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Garudamon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          ignoreRequirements: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-010", compiled);
