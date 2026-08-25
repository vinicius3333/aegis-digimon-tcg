import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-IR override (AUTO-GENERATED header removed so the generator preserves this file). The
// runtime record cannot emit the delete-outcome-conditional [All Turns] clause; the rest of the IR
// is the prose compile preserved verbatim.
//
// BT23-069 Necromon — KB authority (node tools/kb/query.mjs card BT23-069):
//   Q5337: if the opponent has a Lv.<=6 Digimon you MUST choose and delete it.
//   Q5338: a deletion-IMMUNE chosen target satisfies "didn't delete" (count 0) — the gate reads
//     the count ACTUALLY removed, not whether a target was chosen.
//   Q5339/Q5340: "end the attack" changes the TIMING, not the Digimon.
//   by deleting this Digimon, delete 1 of your opponent's level 6 or lower Digimon. If this effect
//   didn't delete your opponent's Digimon, you may end that attack." The opponent-delete's
//   failureProcess (and the no-eligible-target else) end the attack; modeled as the EndAttack
//   action gated on the Wave-1 (08-01) `ifThisEffectDidNotDelete` Condition, which reads the
//   ctx delete-count bound by the preceding opponent Delete. The "by deleting this Digimon" cost
//   is a separate optional self-Delete with abort-on-decline, followed by the mandatory opponent
//   Delete; that second action overwrites the result binding with its own actual outcome, including
//   zero when no eligible target exists, so the gate reflects only the OPPONENT-delete outcome.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Execute",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Ghost"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Ghost"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
              abortOnDecline: true,
              raw: "by deleting this Digimon",
            },
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 6,
                  },
                },
                count: 1,
              },
            },
            {
              kind: "EndAttack",
              optional: true,
              condition: {
                kind: "ifThisEffectDidNotDelete",
              },
              raw: "If this effect didn't delete your opponent's Digimon, you may end that attack",
            },
          ],
          raw: "When another Digimon attacks, by deleting this Digimon, delete 1 of your opponent's level 6 or lower Digimon. If this effect didn't delete your opponent's Digimon, you may end that attack",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
        },
      ],
    },
  ],
  // The delete-outcome-conditional clause is now authored (the [All Turns] EndAttack is gated on
  // the Wave-1 `ifThisEffectDidNotDelete` Condition, inside the whenAttacking SubTrigger body so
  // the gate reads the opponent Delete's ctx count). 08-14 removes the JSON residual in lockstep.
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-069", compiled);
