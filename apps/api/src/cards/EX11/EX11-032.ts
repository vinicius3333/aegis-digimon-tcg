import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX11-032 (GrandGalemon).
// runtime-effect fixes:
// - [Hand][Main]: was an empty action list; encoded as a `Digivolve` action (BT22-026/
//   EX10-066 pattern) — the target Pteromon digivolves into this card for cost 3, ignoring
//   requirements, paid by placing 1 [Galemon] from the trash as that Pteromon's bottom
//   digivolution card (cost host: "target").
// - [When Digivolving]: the DP ceiling raise was a standalone `CostModifier` action with
//   mode "raiseCeiling", which the interpreter doesn't special-case (it fell through to the
//   play-cost predicate branch and modified the wrong thing). Folded into the preceding
//   `PlayWithoutCost` action's `dpCeilingModifier` (now supports `raiseCeiling` + a live
//   `scaling` count). The scaling filter also no longer restricts to `controllerDefault:
//   "mine"` — Q&A Q5840 confirms either player's suspended Digimon counts.
// - [Your Turn] inherited: was unconditional `Unsuspend` on any [Vortex Warriors] Digimon.
//   Text says "When this Digimon wins a battle" (Q5841), so it's gated behind a
//   `whenBattleWon` SubTrigger (EX11-026 pattern); "this [Vortex Warriors] trait Digimon"
//   refers to the source itself (isSelfRef), not a separately-searched trait match. The
//   printed trait is a GATE on the inheriting host (BT26-066 precedent): a host without the
//   [Vortex Warriors] trait inherits the watcher but unsuspends nothing, so the trait rides
//   on the self target, which `candidatePermanents` still runs through `permanentMatchesFilter`.
const compiled: CompiledCard = {
  digivolutionRequirement: [],
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Pteromon"], match: "nameExact" }],
            },
            count: 1,
          },
          into: { isSelfRef: true },
          costOverride: 3,
          payCost: true,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }],
            },
            raw: "you have [Shoto Kazama]",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Galemon"], match: "nameExact" }],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "by placing 1 [Galemon] from your trash as any of your [Pteromon]'s bottom digivolution card",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Pteromon"], match: "nameExact" }],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              dp: {
                op: "lte",
                value: 3000,
              },
              nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          dpCeilingModifier: {
            mode: "raiseCeiling",
            amount: 1000,
            scaling: {
              per: 1,
              filter: {
                controllerDefault: "any",
                suspended: true,
                kind: ["Digimon"],
              },
              unit: "cards",
            },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                  nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }],
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
          raw: "whenBattleWon",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-032", compiled);
