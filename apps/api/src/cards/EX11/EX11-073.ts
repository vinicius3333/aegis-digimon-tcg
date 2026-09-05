import type { CompiledCard, Scaling } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "For each of this Digimon's link cards": `unit: "linkCards"` sums `permanent.linked.length`
// over the permanents matching `filter`, and `isSelfRef: true` narrows that to this Digimon
// alone (`countLinkCards` -> `permanentMatchesFilter`). The `Scaling` annotation is load-bearing:
// unannotated, `unit` widens to `string` and the object stops satisfying `Scaling`, which is the
// error `@ts-nocheck` was hiding.
const selfLinkScale: Scaling = {
  per: 1,
  unit: "linkCards",
  filter: { controller: "mine", kind: ["Digimon"], isSelfRef: true },
};

export const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Black", level: 6 },
      ],
    },
  ],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Link", amount: 2, raw: "＜Link +2＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }],
            },
            count: 3,
            upTo: true,
            source: "thisDigimon",
          },
          from: ["hand", "trash", "digivolutionCards"],
          payCost: false,
          optional: true,
          condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" },
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      // KB Q5947: a "for each XX, [action 1] and [action 2]" clause runs action 1 for every XX
      // first, then action 2 for every XX — two separate RepeatPerCount groups, not one
      // interleaved loop. `countScaling` wins over `countSource` in the interpreter; the
      // `countSource` name is only the type's required fallback slot and nothing writes it.
      actions: [
        {
          kind: "RepeatPerCount",
          countSource: "linkCount",
          countScaling: selfLinkScale,
          action: { kind: "trashSecurityTop", controller: "opponent", count: 1 },
        },
        {
          kind: "RepeatPerCount",
          countSource: "linkCount",
          countScaling: selfLinkScale,
          action: {
            kind: "Return",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            to: "deckBottom",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-073", compiled);
