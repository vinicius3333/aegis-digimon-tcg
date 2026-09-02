import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5044/Q5045: Save is matched in card text; choosing to pay the hand-trash
// processing condition gates both Draw 1 and the opposing Digimon suspension.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand", textContains: "Save" }, count: 1 },
            raw: "By trashing 1 card with ＜Save＞ in its text from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  // No `digivolutionRequirement`: this card prints NO bracketed [Digivolve] alternate route.
  // The two entries the persisted record carries ({level:2,colors:["Green"|"Purple"],cost:1})
  // are the ORDINARY EvoCost rows that already live in cards.json, re-stated as gated
  // alternates. `matchingAlternateDigivolutionRequirement` treats every entry as an alternate
  // path regardless of `isAlternate`, so restating printed EvoCost rows here can only add a
  // second, unprinted route; the standard color/level rule already covers them.
  //
  // "[DigiXros -2] 1 Digimon card with ＜Save＞ in text" — identical printed recipe to
  // BT12-011/074/075, encoded the same way. `texts` runs through the full-card-text union
  // (KB Q5044/Q5027), and `materialMatchesSlot` rejects every non-Digimon card for an unnamed
  // slot, so the printed "Digimon card" half needs no separate predicate (the record's `kind`
  // field does not exist on DigiXrosMaterial and was never read). `count` is the PER-MATERIAL
  // cost reduction, not a material count.
  digiXrosRequirement: [
    {
      materials: [{ texts: ["Save"] }],
      count: 2,
    },
  ],
};

registerIrCard("EX10-015", compiled);
export default compiled;
