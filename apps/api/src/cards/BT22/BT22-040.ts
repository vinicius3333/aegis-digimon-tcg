import type { CompiledCard, KeywordRef } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const overclockKeyword = {
  keyword: "Overclock",
  qualifier: "Puppet",
  raw: "＜Overclock ([Puppet] Trait)＞",
} satisfies KeywordRef & { qualifier: string };

// Hand-authored override for BT22-040 (Cendrillmon).
// <Overclock ([Puppet] Trait)> is a Static keyword, not an EndOfYourTurn grant.
// The keyword means: at end of your turn, delete 1 of your Tokens or other [Puppet]
// trait Digimon → this Digimon attacks a player without suspending.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [overclockKeyword],
      actions: [],
    },
    {
      trigger: "OnPlay",
      optional: true,
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
            },
          ],
          raw: "[All Turns] [Once Per Turn] When any of your other Digimon are deleted, you may activate 1 of this Digimon's [When Digivolving] effects.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
          },
          oncePerTurnKey: "BT22-040/deletion-reactivation",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-040", compiled);
