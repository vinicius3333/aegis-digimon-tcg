// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const ownDigimon = { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 };
const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
const reward = [
  { kind: "Restrict", target: self, restriction: "beAffected", fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true, duration: "untilOpponentTurnEnd" },
  { kind: "ModifyDP", target: self, amount: 6000, duration: "untilOpponentTurnEnd" }
];
const suspendChoice = {
  kind: "Modal",
  choose: 1,
  options: [
    [{ kind: "Suspend", target: ownDigimon }, ...reward],
    [{ kind: "Suspend", target: opponentDigimon }]
  ],
  optional: true,
  abortOnDecline: true
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], effectKey: "EX11-074/piercing", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    { trigger: "Static", actions: [], effectKey: "EX11-074/vortex", keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
    { trigger: "Static", actions: [], effectKey: "EX11-074/blocker", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "WhenDigivolving", optional: true, actions: [suspendChoice] },
    { trigger: "WhenAttacking", optional: true, actions: [suspendChoice] },
    {
      trigger: "AllTurns",
      timingOverride: "OnTappedAnyone",
      actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [
        { kind: "Unsuspend", target: self, optional: true },
        { kind: "Battle", attacker: self, defender: opponentDigimon, optional: true }
      ] }],
      frequency: "OncePerTurn"
    }
  ],
  coverage: "full",
  residual: []
};

registerIrCard("EX11-074", compiled);
