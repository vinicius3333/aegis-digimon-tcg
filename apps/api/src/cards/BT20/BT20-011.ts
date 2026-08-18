// HAND-FIXED IR for BT20-011 (ExVeemon) — do not regenerate over this file.
//
// The generator miscompiled the printed clause "Then, if it's your turn, 2 of your
// Digimon may DNA digivolve into a Digimon card with [Imperialdramon] in its name or
// the [Free] trait in the hand" into TWO sibling actions: a plain `Digivolve` (which
// digivolved one material in place instead of merging two) plus a `DnaDigivolve`
// (documented behavior) drives a single Jogress: CanSelectCardCondition gates the result on
// `IsDigimon && (CardTraits.Contains("Free") || ContainsCardName("Imperialdramon"))`
// and calls DNADigivolvePermanentsIntoHandOrTrashCard(payCost:true, isHand:true).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type Actions = CompiledCard["effects"][number]["actions"];

const dnaBody = [
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        dp: { op: "lte", value: 3000 },
      },
      count: 1,
    },
  },
  {
    kind: "DnaDigivolve",
    materials: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
      },
      count: 2,
    },
    into: {
      controllerDefault: "mine",
      kind: ["Digimon"],
      nameOrTrait: [
        { tokens: ["Imperialdramon"], match: "name" },
        { tokens: ["Free"], match: "trait" },
      ],
    },
    payCost: true,
    optional: true,
    condition: { kind: "isYourTurn", raw: "it's your turn" },
  },
] as unknown as Actions;

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: dnaBody,
    },
    {
      trigger: "WhenDigivolving",
      actions: dnaBody,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ] as unknown as Actions,
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-011", compiled);
