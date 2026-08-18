import { describe, it, expect } from "vitest";
// Importing the cards barrel self-registers every compiled-IR / hand-written module
// (boot side-effect) so the engine can look up BT3-040's static effects.
import "../cards/index.js";
import { setupEngine } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { extractPermanentAt } from "./state/access.js";


const SOURCE_CARD = "BT3-040"; // [Opponent's Turn] opponent no-evo Digimon gain ＜Security Attack -1＞
const TARGET_NO_EVO = "BT1-009"; // a vanilla Digimon with no digivolution cards (eligible target)

describe("A3 continuous modifier lapses when its source leaves play (SYS-03)", () => {
  it("BT3-040 grants the opponent's no-evo Digimon ＜Security Attack -1＞; once BT3-040 leaves play, the grant is GONE", async () => {
    // It is seat1's turn, so for seat0's BT3-040 it is the OPPONENT's turn — the gate the
    // [Opponent's Turn] ＜Security Attack -1＞ grant requires (documented behavior IsOpponentTurn).
    const s = setupEngine({
      0: { battleArea: [{ card: SOURCE_CARD, dp: 9000, as: "source" }] },
      1: { battleArea: [{ card: TARGET_NO_EVO, dp: 3000, as: "target" }] },
    });
    s.state.turnSeat = 1;
    const target = s.perm("target");
    const sourceId = s.perm("source").permanentId;

    // Re-derive the continuous tier: BT3-040's [Opponent's Turn] static fires and records
    // ＜Security Attack -1＞ on the opponent's no-evo Digimon.
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(target, "SecurityAttack")).toBe(true);

    // The source leaves play (e.g. deleted in battle). dropPermanent clears entries scoped to
    // the source; the next recompute re-derives the tier from a clean slate, and with BT3-040
    // gone the static effect is not re-fired — so the grant must NOT be re-recorded.
    const p0 = s.state.players[0]!;
    const idx = p0.battleArea.findIndex((p) => p.permanentId === sourceId);
    extractPermanentAt(p0, idx);
    advance(s.engine).ledgers.continuous.dropPermanent(sourceId);
    await s.engine.recomputeContinuousEffects();

    // LAPSED: the opponent's Digimon reverts — no ＜Security Attack -1＞ now that the source
    // has left play.
    expect(observe(s.engine).hasKeyword(target, "SecurityAttack")).toBe(false);
  });

  it("negative control: while BT3-040 stays in play, re-running the recompute keeps the grant (it is not spuriously dropped)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: SOURCE_CARD, dp: 9000 }] },
      1: { battleArea: [{ card: TARGET_NO_EVO, dp: 3000, as: "target" }] },
    });
    s.state.turnSeat = 1;
    const target = s.perm("target");

    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    // Idempotent + persistent: the grant is still present after repeated recomputes while the
    // source remains in play (the lapse is specifically tied to the source leaving).
    expect(observe(s.engine).hasKeyword(target, "SecurityAttack")).toBe(true);
  });
});
