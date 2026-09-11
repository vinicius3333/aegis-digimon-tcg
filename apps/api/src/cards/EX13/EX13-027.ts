import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-027 Chuumon (Yellow, Lv.3 Rookie [Beast], Virus, play cost 3, DP 1000).
// Printed EvoCosts are dual: Yellow Lv.2 cost 0 and Black Lv.2 cost 0 — both carried by the
// catalog, so no `digivolutionRequirement` entry is needed (the card prints no [Digivolve] header).
//
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 card with
// [Sukamon] or [Etemon] in its name to the hand and trash 1 such card. Return the rest to the
// bottom of the deck.
//   One sentence printed under two timings, so it compiles to two effects sharing one action
//   list — the EX13-007 / EX13-008 shape, not a single effect with a compound trigger.
//
//   "with [Sukamon] or [Etemon] in its name" is the SUBSTRING reading (`match: "name"`,
//   comprehensive §4-22-1 on card names), which is how the same phrase is encoded on the
//   Chuumon siblings BT13-062 and EX5-045: PlatinumSukamon and MetalEtemon qualify, while a
//   card that merely mentions [Sukamon] in its printed text (Geremon, BT11-063) does not.
//   Both tokens live in ONE reference because `tokens` is an OR-list; two references would
//   read as a conjunction.
//
//   "add 1 ... to the hand and trash 1 such card" is verbatim BT24-066's shape: two add slots
//   over the SAME filter, the second `to: "trash"` and guarded by `requiresMinRevealed: 2`
//   so that a lone revealed match goes to hand and nothing is trashed. (That guard is belt and
//   braces: the hand slot already consumes the only match, so removing it changes no observable
//   behaviour — it is kept for parity with BT24-066.) Neither slot is
//   optional — the sentence carries no "you may". `rest: "deckBottom"` is the printed
//   "Return the rest to the bottom of the deck".
//
// [Inherited] [All Turns] [Once Per Turn] When this Digimon would leave the battle area other
// than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave.
//   A `wouldLeavePlay` Replacement in `mode: "prevent"` with `sourceFilter: { isSelfRef: true }`
//   and `leaveCause: "otherThanYourEffect"`, the EX11-022 / EX13-015 encoding. The cost is the
//   engine's generic `deleteOwn` "delete as a cost" primitive, which honours its target's
//   `controller`.
//
//   The clause says "1 other Digimon", NOT "1 of your other Digimon" (contrast the EX13-048 /
//   EX13-052 wording in this very set), so the cost target is `controller: "any"` — exactly how
//   the two earlier cards printing this same sentence are encoded (BT11-040, BT13-065).
//   `excludeSelf: true` is the printed "other".
//
//   The printed [Once Per Turn] is the effect's `frequency`, the EX11-022 shape. EX13-015 also
//   declares a redundant `oncePerTurnKey` on its own leave replacement; a mutation run proved
//   `frequency` alone is what the interpreter budgets here (dropping the key changes no
//   behaviour, dropping `frequency` lets a second leave be prevented in the same turn), so the
//   key is left off rather than carried as an unproven field.
const sukamonOrEtemonNamed: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Sukamon", "Etemon"], match: "name" }],
};

const revealAddAndTrash = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    { filter: sukamonOrEtemonNamed, count: 1, to: "hand" },
    { filter: sukamonOrEtemonNamed, count: 1, to: "trash", requiresMinRevealed: 2 },
  ],
  rest: "deckBottom",
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [revealAddAndTrash()],
    },
    {
      trigger: "OnPlay",
      actions: [revealAddAndTrash()],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "any",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
              },
              count: 1,
            },
            raw: "by deleting 1 other Digimon with [Sukamon] in its name",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-027", compiled);
