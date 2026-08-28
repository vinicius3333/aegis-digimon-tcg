// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
        {
          keyword: "MaterialSave",
          amount: 3,
          raw: "＜Material Save 3＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Shoutmon"],
        },
        {
          names: ["Ballistamon"],
        },
        {
          names: ["Dorulumon"],
        },
        {
          names: ["Starmons"],
        },
        {
          names: ["Sparrowmon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT10-013", compiled);
