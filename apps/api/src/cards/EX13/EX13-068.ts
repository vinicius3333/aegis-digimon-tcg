import type { CompiledCard, CostGatedBlockAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-068 Takato Matsuki (Tamer, Red, play cost 4)
// Text:
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [Start of Your Main Phase] By returning this Tamer to the bottom of the deck, you may
//   play 1 [Takato Matsuki] from your hand without paying the cost. After, if you don't
//   have a Digimon, you may play 1 [Guilmon] from your trash without paying the cost.
//   [Security] Play this card without paying the cost.
//
// Rules notes (no card-specific KB entries — EX13 is pre-release):
//   - comprehensive §6-2-1: the [Start of Your Turn] memory floor resolves BEFORE the
//     unsuspend processing of the unsuspend phase, and that rule's own worked example is
//     this exact sentence ("If you have 2 or less memory, set it to 3").
//   - comprehensive §4-1-3: "If you have X or less memory" reads the gauge on the
//     controller's side, hence the plain `memoryAtMost` condition (BT26-096's shape).
//   - comprehensive §3-4-5-8: breeding-area card information can't be referenced unless
//     an effect says so, so "if you don't have a Digimon" is battle-area only. The
//     `zone: "battleArea"` below is declarative (`countMatching` already skips breeding
//     unless the filter names it) but states the scope the rule requires.
//   - The return cost gates the whole sentence, so both plays live inside one
//     `CostGatedBlock` with `abortOnDecline` (BT24-082/BT22-086/BT23-087/EX10-063 shape).
//     Unlike those peers this card prints "After," not "Then,": the second play does not
//     require the first to have happened, which is exactly what two sibling `optional`
//     actions inside the block give — declining the first still offers the second.
const playSelfNamed: CostGatedBlockAction = {
  kind: "CostGatedBlock",
  cost: {
    kind: "return",
    to: "deckBottom",
    target: {
      filter: { isSelfRef: true },
      count: 1,
      isSelf: true,
    },
    raw: "By returning this Tamer to the bottom of the deck",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Guilmon"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["trash"],
      payCost: false,
      condition: {
        kind: "youHaveNone",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          zone: "battleArea",
        },
        raw: "you don't have a Digimon",
      },
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [playSelfNamed],
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

registerIrCard("EX13-068", compiled);
