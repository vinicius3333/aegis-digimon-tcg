import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5142-Q5148/Q5166-Q5167: exact two-card payment, opponent-only digivolve/placement events,
// and no trigger from linking (Q5148). Both event forms carry the same `oncePerTurnKey`, so
// they consume ONE physical [Once Per Turn] use.
//
// Every node below is written inline. The previous revision built the two [On Play]/[When
// Digivolving] effects with `["OnPlay", "WhenDigivolving"].map(...)` and hoisted the watcher
// body into a bare `const`; both widened their string literals (`trigger: string`,
// `kind: string`) so the whole card failed to typecheck against `CompiledCard`.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
            from: ["battleArea"],
            count: 1,
          },
          // Q5144: the host is any OTHER opposing Digimon or Tamer. `placeUnder` already drops
          // the relocated permanent from its own host candidates, so no self-exclusion field is
          // needed here (the previous `excludeSelf: true` compared against the SOURCE — this
          // card — and could never match an opposing permanent).
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          targetIsPermanent: true,
          // Q5143: a host that already has cards under it receives this one at the true bottom.
          position: "bottom",
          // Q5145: the placed Digimon LEAVES the battle area, so only its top card becomes a
          // digivolution card and its own digivolution cards are trashed at the same time.
          shedOwnCards: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" },
            from: ["battleArea"],
            count: 1,
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          targetIsPermanent: true,
          position: "bottom",
          shedOwnCards: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          // "your opponent's Digimon OR TAMERS digivolve": a Tamer base digivolves as a Tamer,
          // and the engine's `tamerDigivolvedGate` withholds a watcher whose kind list names
          // only Digimon (Q6671/Q6708 precedent, BT18-010).
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          oncePerTurnKey: "EX10-056/all-turns",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              // Q5142: the "by" condition is all-or-nothing — exactly 2 digivolution cards, and
              // it is declinable (CR 15-7-4).
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          // "or EFFECTS place cards under them": only an effect-driven placement counts. An
          // ordinary digivolution also rides this bus and is covered by the sibling watcher;
          // Q5148 needs no gate here because the link verb never posts this event at all.
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"], byEffect: true },
          oncePerTurnKey: "EX10-056/all-turns",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // No `digivolutionRequirement`: the catalog's Purple/Lv.5/cost-5 row is the PRINTED EvoCost,
  // and `matchingAlternateDigivolutionRequirement` treats every entry here as an ALTERNATE
  // route. Restating the printed row registered a second, unprinted route.
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 }],
};

registerIrCard("EX10-056", compiled);

export { compiled };
export default compiled;
