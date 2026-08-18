import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-089 Mirei Mikagura (hand-authored override of the runtime record IR).
//
// Two fixes over the declarative effect record:
//  1. The [On Play] clause encoded to an empty `actions: []` (silent no-op) — the same
//     Authored as a Draw 2 carrying an optional trash-from-hand cost.
//  2. The [Start of Your Main Phase] PlayWithoutCost dropped the printed "play cost 4 or higher"
//     constraint; restored as a
//     `playCost: { op: "gte", value: 4 }` filter clause.
//
// Source (behavior reference): documented behavior.
//  - OnStartMainPhase: DeckBouncePeremanent (cost: return this Tamer to deck bottom) then SuccessProcess
//    plays 1 hand card that is play-cost >=4 AND ([Mirei Mikagura] by name OR Tamer with [CS] trait),
//    without paying cost. Modeled as PlayWithoutCost with an optional self-return cost.
//  - OnEnterFieldAnyone: trash 1 [Holy Beast]/[Angel]/[Archangel]/[Fallen Angel]/[CS] hand card
//    (canNoSelect:true), then Draw 2.
//  - SecuritySkill: play this Tamer from security without paying the cost (carried through unchanged).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              playCost: { op: "gte", value: 4 },
              nameOrTrait: [
                { tokens: ["Mirei Mikagura"], match: "name" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [
                  { tokens: ["Holy Beast"], match: "trait" },
                  { tokens: ["Angel"], match: "trait" },
                  { tokens: ["Archangel"], match: "trait" },
                  { tokens: ["Fallen Angel"], match: "trait" },
                  { tokens: ["CS"], match: "trait" },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Holy Beast], [Angel], [Archangel], [Fallen Angel] or [CS] trait from your hand",
          },
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

registerIrCard("BT22-089", compiled);
