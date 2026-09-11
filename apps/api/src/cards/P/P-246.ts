import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-246 Motimon (Digi-Egg, Black, level 2, In-Training, [Lesser] type, play cost -1).
//
// Printed text — a Digi-Egg carries inherited text only, no main text and no Security text:
//   [Your Turn] [Once Per Turn] When any of your other Digimon with [Sukamon] or [Mamemon] in
//     their names are deleted, this Digimon may digivolve into a Digimon card with [Sukamon],
//     [Etemon] or [Mamemon] in its name in the hand with the cost reduced by 2.
//
// KB: `node tools/kb/query.mjs card P-246` reports no entries. The card is announced for
// Official Store Tournament 2026 Vol.4 (street date 2026-10-01) and is not distributed yet, so
// no card-specific ruling exists; the printed sentence is unambiguous and needs none. General
// rules read from `data/kb/rules/comprehensive.md`:
//   - §4-23-1 / §4-23-2: a Digimon USES the effects printed on its digivolution cards; the
//     inherited clause's "this Digimon" is the live permanent carrying this egg, which is what
//     `isSelfRef` resolves to.
//   - §15-14: [Once Per Turn] limits the physical card, so one digivolve per turn however many
//     matching Digimon are deleted.
//   - §6-2-*: a [Your Turn] clause is live only while its controller is the turn player; the
//     interpreter stamps `turnScope` from the `YourTurn` trigger at registration (P-188).
//   - §7-*: "digivolve ... with the cost reduced by 2" is an ordinary digivolution — the
//     printed digivolution requirement of the destination still has to be met; only the memory
//     cost changes. Hence `payCost: true` + `costDelta: -2` rather than `ignoreRequirements`.

// "any of your other Digimon with [Sukamon] or [Mamemon] in their names" — a LIVE board subject
// being deleted. `match: "name"` is the substring reading every [Sukamon]/[Mamemon] clause in
// the catalog uses (EX13-027, EX13-031), so BigMamemon and PlatinumSukamon qualify.
//
// Note the trigger set is NARROWER than the destination set: [Etemon] is a legal thing to
// digivolve INTO but an Etemon deletion does not fire the clause.
//
// `excludeSelf` records the printed "other". It has no reachable behavioral consequence — the
// only permanent it could exclude is the watcher's own host, and a host that was just deleted is
// no longer in the battle area to digivolve — so it is kept for fidelity, not proven by a test
// (mutation-checked: removing it leaves every case below green).
const deletedSukamonOrMamemon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  excludeSelf: true,
  nameOrTrait: [{ tokens: ["Sukamon", "Mamemon"], match: "name" }],
};

const compiled: CompiledCard = {
  cardId: "P-246",
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: deletedSukamonOrMamemon,
          actions: [
            // BT22-037's shape for "this Digimon may digivolve into a Digimon card with [X] in
            // its name in the hand with the cost reduced by 2": `from: ["hand"]` only (the trash
            // copy of a legal destination is NOT reachable), `payCost: true` + `costDelta: -2`,
            // and `optional: true` for "may".
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon", "Etemon", "Mamemon"], match: "name" }],
              },
              from: ["hand"],
              payCost: true,
              costDelta: -2,
              optional: true,
              raw: "this Digimon may digivolve into a Digimon card with [Sukamon], [Etemon] or [Mamemon] in its name in the hand with the cost reduced by 2",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("P-246", compiled);
