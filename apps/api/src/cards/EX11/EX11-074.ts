// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const reward = [
  { kind: "Restrict", target: self, restriction: "beAffected", fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true, duration: "untilOpponentTurnEnd" },
  { kind: "ModifyDP", target: self, amount: 6000, duration: "untilOpponentTurnEnd" }
];
const suspendChoice = [
  { kind: "Suspend", target: { filter: { kind: ["Digimon"] }, count: 1 }, optional: true, abortOnDecline: true },
  ...reward.map((action) => ({ ...action, condition: { kind: "lastSuspendedIsMine" } }))
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-074/piercing",
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }]
    },
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-074/vortex",
      keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }]
    },
    {
      trigger: "Static",
      actions: [],
      effectKey: "EX11-074/blocker",
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }]
    },
    { trigger: "WhenDigivolving", optional: true, actions: suspendChoice },
    { trigger: "WhenAttacking", optional: true, actions: suspendChoice },
    {
      trigger: "AllTurns",
      timingOverride: "OnTappedAnyone",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            { kind: "Unsuspend", target: self, optional: true },
            { kind: "Battle", attacker: self, defender: opponentDigimon, optional: true }
          ]
        }
      ],
      frequency: "OncePerTurn"
    }
  ],
  coverage: "full",
  residual: []
};

export default registerIrCard("EX11-074", compiled);
