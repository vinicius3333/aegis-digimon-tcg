import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-078 Reapermon.
// Q4401/Q4402: the All Turns watcher is an effect-driven digivolution event, not a
// generic play or rule-based Tamer-as-Digimon transition.
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Collision", raw: "＜Collision＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: { controllerDefault: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "DeDigivolve",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: 1,
            },
          ],
          raw: "When effects digivolve your opponent's Digimon, ＜De-Digivolve 1＞ 1 of your opponent's Digimon",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 4 },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-078", compiled);
