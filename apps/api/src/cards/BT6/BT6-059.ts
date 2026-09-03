// Hand-authored override (errata 2021-09-03): "<Decoy (Black)> (...would be deleted...)"
// -> "...would be deleted BY AN OPPONENT'S EFFECT...". The added qualifier is <Decoy>
// keyword semantics (engine-level); the IR grants the <Decoy (Black)> static via a
// self GainKeyword (equivalent to the keywords-array expansion the interpreter applies).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decoy",
          raw: "＜Decoy (Black)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-059", compiled);
