import type { Action, CompiledCard, Condition, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const opponentDigimon: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
const suspendedMine: Condition = {
  kind: "lastSuspendedIsMine",
  raw: "if this effect suspended your Digimon",
};
const suspendAndProtect: Action[] = [
  {
    kind: "Suspend",
    target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 },
    optional: true,
  },
  {
    kind: "Restrict",
    target: self,
    restriction: "beAffected",
    fromSourceKind: ["Digimon"],
    byOpponentEffectsOnly: true,
    duration: "untilOpponentTurnEnd",
    condition: suspendedMine,
  },
  {
    kind: "ModifyDP",
    target: self,
    amount: 6000,
    duration: "untilOpponentTurnEnd",
    condition: suspendedMine,
  },
];

// KB Q5948 permits the first target on either field. Q5949-Q5954 scope the
// conditional immunity to the opponent's Digimon effects. Q5955-Q5959 confirm
// the All Turns battle is a direct battle, not another attack/security check.
//
// The shared consts carry explicit IR annotations on purpose: without them the object
// literals widen (`kind: string`, `controller: string`) and stop satisfying `Action`/`Target`,
// which is what hid the shape from the compiler while `@ts-nocheck` was in place.
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "WhenDigivolving", actions: suspendAndProtect },
    { trigger: "WhenAttacking", actions: suspendAndProtect },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            { kind: "Unsuspend", target: self, optional: true },
            { kind: "Battle", attacker: self, defender: opponentDigimon, optional: true },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["GrandGalemon"],
      cost: 6,
      isAlternate: true,
      // CR 16-4-2/16-4-3: controllerControls checks the card's effective kinds;
      // Shoto Kazama is both a Tamer and a Digimon card in the catalog.
      controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Shoto Kazama"], min: 1 },
    },
  ],
};

registerIrCard("EX11-074", compiled);

export default compiled;
