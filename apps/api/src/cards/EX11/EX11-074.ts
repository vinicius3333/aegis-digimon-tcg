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
            {
              effectTextPart: "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend.",
              kind: "Unsuspend",
              target: self,
              optional: true,
            },
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
      controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Shoto Kazama"], min: 1 },
    },
  ],
};

registerIrCard("EX11-074", compiled);

export default compiled;
