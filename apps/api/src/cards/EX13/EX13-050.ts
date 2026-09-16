import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-050 Bokomon (Digimon, Black, Lv.3 Rookie [Mutant], Vaccine, 1000 DP, play cost 3,
// printed EvoCost Black Lv.2 for 0).
//
// Printed main text:
//   [All Turns] Players can't gain memory other than by Tamer effects.
// Printed inherited text:
//   ＜Blocker＞
// No printed security text and no printed [Digivolve] header, so there is no
// `digivolutionRequirement`: the only route in is the catalog EvoCost or the printed play cost.
//
// KB: `node tools/kb/query.mjs card EX13-050` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §15-12-1-6: the restriction is judged by whether the gaining effect is a
//     TAMER effect, and a Tamer that is also treated as a Digimon still counts as a Tamer effect.
//     That classification lives in the engine's memory-gain path, not in the IR.
//   - comprehensive §16-2 ＜Blocker＞: a keyword the engine resolves natively, so the inherited
//     window carries only the `keywords` marker and no actions.
//
// "PLAYERS can't gain memory" is symmetric — both seats — so the seat is `"any"`, not
// `"opponent"`. That is the one field separating this card from ST21-02, whose printed text reads
// "Your opponent can't gain memory other than by Tamer effects". The exact printed sentence
// already exists on BT25-079 (the only other printing), and this file reuses its encoding
// verbatim: a permanent-duration `RestrictMemoryGain` in an `AllTurns` window with
// `exceptTamerEffects: true`. The restriction is a continuous seat lock that lives only while the
// permanent is on the battle area, which is what `duration: "permanent"` means for a static
// clause (it ends when the source leaves, not at a turn boundary).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictMemoryGain",
          seat: "any",
          exceptTamerEffects: true,
          duration: "permanent",
          raw: "Players can't gain memory other than by Tamer effects",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-050", compiled);
