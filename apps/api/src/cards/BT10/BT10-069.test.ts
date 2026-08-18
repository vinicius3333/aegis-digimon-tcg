import { EffectTiming } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-069.js";

/**
 * A3 for BT10-069 (DarkKnightmon (X Antibody)) — the [When Digivolving] Return clause.
 *
 *   [When Digivolving] Return 1 black or purple non-[DarkKnightmon (X Antibody)] Digimon
 *   card from your trash to your hand. Then, if [DarkKnightmon] or [X Antibody] is in
 *   this Digimon's digivolution cards, delete 1 Tamer, and unsuspend this Digimon.
 *
 * `cards.json.effectText` for BT10-069 spells out "non-[DarkKnightmon (X Antibody)]" —
 * the Return target must EXCLUDE a copy of this card's own name, not match only it.
 * The nameOrTrait ref carries `negate: true` for exactly this reason.
 *
 * FAILS-WHEN-REVERTED: dropping `negate: true` from the ref (or the interpreter's
 * negate handling in `matchNameOrTrait`) inverts the filter — it then matches ONLY
 * "DarkKnightmon (X Antibody)" copies, so the excluded card in trash becomes the
 * chosen target instead of the eligible one, and the assertions below flip.
 */

const DARKKNIGHTMON_XA = "BT10-069";
const DARKKNIGHTMON_BASE = "BT10-066"; // Lv.5 [DarkKnightmon], satisfies the digivolution requirement
const OTHER_BLACK_DIGIMON = "AD1-004"; // WarGreymon — Red/Black, not named DarkKnightmon (X Antibody)

describe("BT10-069 — [When Digivolving] Return excludes its own name (non-[DarkKnightmon (X Antibody)])", () => {
  it("returns the OTHER black/purple Digimon, leaving the excluded namesake in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DARKKNIGHTMON_BASE, as: "base" }],
          hand: [{ card: DARKKNIGHTMON_XA, as: "evolving" }],
          trash: [
            { card: DARKKNIGHTMON_XA, as: "excludedNamesake" },
            { card: OTHER_BLACK_DIGIMON, as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const evolving = s.inst("evolving");
    const eligible = s.inst("eligible");
    const excludedNamesake = s.inst("excludedNamesake");

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === eligible.instanceId));

    // The eligible non-namesake card was returned to hand ...
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === eligible.instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === eligible.instanceId)).toBe(false);
    // ... while the excluded namesake stayed in trash, untouched.
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === excludedNamesake.instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === excludedNamesake.instanceId)).toBe(false);
  });

  it("does not treat DarkKnightmon (X Antibody) as exact DarkKnightmon or X Antibody sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: DARKKNIGHTMON_XA, as: "darkKnightX", suspended: true, under: [DARKKNIGHTMON_XA] }] },
        1: { battleArea: [{ card: "BT10-088", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("darkKnightX"));

    expect(s.perm("darkKnightX").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tamer").permanentId)).toBe(true);
  });
});
