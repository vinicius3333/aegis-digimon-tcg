// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const yellow = {
  kind: "youHave",
  filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], colors: ["Yellow"] },
};
const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    actions: [
      {
        kind: "Aura",
        target: self,
        effect: { kind: "keyword", keyword: { keyword: "Rush", raw: "＜Rush＞" } },
        while: yellow,
      },
      {
        kind: "Aura",
        target: self,
        effect: { kind: "keyword", keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" } },
        while: yellow,
      },
    ],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-080", compiled);
