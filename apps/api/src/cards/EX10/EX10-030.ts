import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Cometmon prints, in order: [App Fusion], <Collision>, an [On Play][When Digivolving] free
// link, an [All Turns][Once Per Turn] link-trash reaction, and the lower-box
// "[All Turns][Once Per Turn] When this Digimon would leave the battle area, by trashing 1 of
// its link cards, it doesn't leave."
//
// A "[When Attacking] by trashing 1 of this Digimon's link cards, return 1 [Appmon] Digimon
// card from your trash to the hand" effect used to be recorded here. No such clause appears in
// the catalog (`effectText`, `inheritedEffectText`, `linkEffect`) or in any KB entry, so it has
// been removed — it was returning cards from the trash on every attack for free.
//
// Q5087 is why the free link narrows to `hasLinkRequirement: true`: a card without <Link>
// cannot be chosen.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["hand", "digivolutionCards"],
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
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -8000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    // Recorded as `isInherited` because the catalog carries this clause in
    // `inheritedEffectText`. KB Q5086/Q5089 call it "this card's LINK effect", and EX10-030 is
    // the only card in the whole catalog with a `linkRequirement` and an `inheritedEffectText`
    // but no `linkEffect`, so the catalog field is probably a scrape error. The distinction is
    // behaviourally moot here and the test proves it: the engine collects this effect from BOTH
    // residencies, so the replacement fires whether Cometmon sits in the host's digivolution
    // stack or in its link zone, and Q5086/Q5089 are satisfied either way. The module therefore
    // follows the committed catalog with no loss of printed behaviour.
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "trash",
                target: {
                  filter: { isSelfRef: true, zone: "linked" },
                  count: 1,
                },
                raw: "by trashing 1 of its link cards",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Warpmon", "Weatherdramon"],
      cost: 0,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

export { compiled };

registerIrCard("EX10-030", compiled);
