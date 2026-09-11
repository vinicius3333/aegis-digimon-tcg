import type { CompiledCard, CostGatedBlockAction } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-248 Veemon — Blue/Red Lv.3 Rookie, [Free] attribute, [Mini Dragon], play cost 3, DP 2000.
// Text:
//   [Digivolve] [DemiVeemon]: Cost 0
//   [Start of Your Main Phase] By trashing 1 card with [Veedramon] in its text or the
//   [Armor Form] or [Free] trait from your hand, ＜Draw 1＞ and gain 1 memory.
//   Inherited: [Your Turn] This Digimon gets +2000 DP.
//
// Rules notes (no card-specific KB entries — P-245..P-250 are announced but not yet
// distributed, so `tools/kb/query.mjs card P-248` is empty by construction):
//   - The `[Digivolve] [DemiVeemon]: Cost 0` header is a `digivolutionRequirement` entry, not
//     an effect, and a bare bracketed `[Name]` is the EXACT reading, so it uses `namesExact`
//     (EX13-008's `[Digivolve] [Bebydomon]: Cost 0`, BT16-011's `[Digivolve] [Garudamon]`).
//     It is colorless and additive: the two printed evoCosts (Blue Lv.2 cost 1, Red Lv.2
//     cost 1) stay available, and an off-colour DemiVeemon still reaches this card for 0.
//   - "1 card with [Veedramon] in its text or the [Armor Form] or [Free] trait" is one union
//     of two `nameOrTrait` entries (`definitionMatches` ORs the array). `match: "text"` is the
//     full name/trait/text union the engine documents for "in its text" prose — a card NAMED
//     [Veedramon] has it in its text too — exactly EX13-008's reading of "with [Dracomon] or
//     [Examon] in its text". `match: "trait"` is whole-token trait identity over
//     forms ∪ attributes ∪ types, which is where both [Armor Form] (a form) and [Free]
//     (an attribute) live (`staticTraitsOf`).
//   - The trash is an ACTIVATION COST with no "may": comprehensive §5-3 makes the whole
//     sentence skip when it cannot be paid, and pays it when it can. So it is one
//     `CostGatedBlock` with `abortOnDecline` and NO `Cost.optional` — one payment gating both
//     the draw and the memory gain (EX13-068/EX6-021 shape, Q3719). P-242 prints the same
//     sentence shape but hangs the cost off its `Draw` action alone, which would let the
//     memory gain resolve after an unpayable cost; the block form is the faithful one.
//   - Every [Armor Form] print in the committed catalog also carries [Free], so the two trait
//     tokens cannot be separated by any real fixture. Both are encoded; the colocated test
//     asserts the token pair in the IR and exercises the trait branch with BT12-037
//     (Armor Form + Free) and BT1-027 (Free alone).
const trashForDrawAndMemory: CostGatedBlockAction = {
  kind: "CostGatedBlock",
  cost: {
    kind: "trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
        nameOrTrait: [
          { tokens: ["Veedramon"], match: "text" },
          { tokens: ["Armor Form", "Free"], match: "trait", orPrevious: true },
        ],
      },
      count: 1,
    },
    raw: "By trashing 1 card with [Veedramon] in its text or the [Armor Form] or [Free] trait from your hand",
  },
  abortOnDecline: true,
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "GainMemory", amount: 1 },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-248/start-main-trash-draw-memory",
      trigger: "StartOfYourMainPhase",
      actions: [trashForDrawAndMemory],
    },
    {
      effectKey: "P-248/inherited-your-turn-dp",
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["DemiVeemon"], cost: 0, isAlternate: true }],
};

registerIrCard("P-248", compiled);
